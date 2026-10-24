// Products floor commands for developments (SIMULATION §16.6): start and cancel
// a development, and delete a developed product (its accounts move onto the
// base product at each branch, so no balance is lost).
import { DEV_BUDGET_STEP, DEV_MIN_WEEKLY, DEV_TERMS, PRODUCT_NAME_MAX } from '../../config/balance';
import { DEV_TEMPLATES } from '../../data/devTemplates';
import { emptyBook } from '../branch/books';
import { devOdds, type DevTerm } from '../development';
import { newId } from '../ids';
import { roundToStep } from '../math';
import type { Book, DevTier, GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

const TIERS: readonly DevTier[] = ['low', 'medium', 'premium'];

export interface StartDevelopmentInput {
  name: string;
  templateId: string;
  tier: DevTier;
  weeks: number;
  weeklyBudget: number;
}

export function startDevelopment(
  state: GameState,
  input: StartDevelopmentInput,
): CommandResult<{ developmentId: string; odds: number[] }> {
  const template = DEV_TEMPLATES[input.templateId];
  if (!state.departments.products) return fail('Product development needs a Products floor at HQ.');
  if (!template) return fail('Pick a product type.');
  if (template.digital && !state.departments.it)
    return fail('Digital projects need an IT floor at HQ.');
  if (template.digital) {
    const running = state.products.developments.some((d) => d.templateId === template.id);
    if (running || state.products.digitalDone?.includes(template.id))
      return fail(`${template.name} is already ${running ? 'under way' : 'done'}.`);
  }
  const name = input.name.trim() || (template.digital ? template.name : '');
  if (!name) return fail('Give the product a name.');
  if (name.length > PRODUCT_NAME_MAX)
    return fail(`Names can be up to ${PRODUCT_NAME_MAX} characters.`);
  if (!TIERS.includes(input.tier)) return fail('Pick a price tier.');
  if (!(DEV_TERMS as readonly number[]).includes(input.weeks))
    return fail(`Development time is ${DEV_TERMS.join(', ')} weeks.`);
  if (!Number.isFinite(input.weeklyBudget)) return fail('Enter a weekly budget.');
  const weeklyBudget = roundToStep(input.weeklyBudget, DEV_BUDGET_STEP);
  if (weeklyBudget < DEV_MIN_WEEKLY)
    return fail(`The weekly budget starts at ${money(DEV_MIN_WEEKLY)}.`);
  if (state.company.cash < weeklyBudget)
    return fail(`You need ${money(weeklyBudget)} in cash for the first week.`);

  const odds = devOdds(state, input.weeks, weeklyBudget);
  const id = newId(state, 'proj');
  state.products.developments.push({
    id,
    name,
    templateId: template.id,
    tier: input.tier,
    weeks: input.weeks as DevTerm,
    weeklyBudget,
    spent: 0,
    progress: 0,
    odds,
    startWeek: state.clock.week,
  });
  return ok({ developmentId: id, odds });
}

/** Stops a development. Money already spent is gone. */
export function cancelDevelopment(state: GameState, developmentId: string): CommandResult {
  const list = state.products.developments;
  if (!list.some((d) => d.id === developmentId)) return fail('That development has ended.');
  state.products.developments = list.filter((d) => d.id !== developmentId);
  return ok();
}

/** Moves a whole book into another, blending rates and risk by balance. */
function absorb(into: Book, from: Book): void {
  const total = into.balance + from.balance;
  if (total > 0) {
    into.bookRate = (into.balance * into.bookRate + from.balance * from.bookRate) / total;
    into.pd = (into.balance * into.pd + from.balance * from.pd) / total;
    into.lgd = (into.balance * into.lgd + from.balance * from.lgd) / total;
  }
  into.balance = total;
  into.accounts += from.accounts;
}

/**
 * Deletes a developed product. Every branch stops offering it, and its
 * customers and balances move onto the base product's book at that branch.
 */
export function deleteProduct(state: GameState, productId: string): CommandResult {
  const entry = state.products.catalog[productId];
  if (!entry) return fail('Unknown product.');
  if (!entry.developed || !entry.base) return fail('Only products you developed can be deleted.');
  const baseId = entry.base;
  for (const branch of Object.values(state.branches)) {
    const book = branch.books[productId];
    if (book) absorb((branch.books[baseId] ??= emptyBook()), book);
    delete branch.books[productId];
    delete branch.offered[productId];
  }
  for (const list of Object.values(state.company.companyPrices)) if (list) delete list[productId];
  if (state.company.companyOffered) delete state.company.companyOffered[productId];
  delete state.products.catalog[productId];
  return ok();
}
