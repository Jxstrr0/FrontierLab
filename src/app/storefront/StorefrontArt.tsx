// Hero vignette for an available location (SCREENS §3, ART_DIRECTION §3): an
// empty storefront with a bare awning frame, papered-over windows, a "Vacant"
// fascia and an "Available" sign on a post, engraved in the city ink.
import { rect } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

export function StorefrontArt() {
  return (
    <Vignette label="An empty storefront with an Available sign">
      <path d="M0 132h320" class="art-line" />
      {/* Faint neighbours. */}
      <g class="art-faint">
        <path
          d="M12 132V70h50v62M8 70h58M20 82h12v14H20zM42 82h12v14H42z"
          class="art-line art-fine"
        />
        <Hatch pts={rect(8, 66, 58, 4)} density="dense" />
      </g>
      {/* Building: side return, front, cornice. */}
      <Face
        pts={[
          [250, 38],
          [262, 32],
          [262, 132],
          [250, 132],
        ]}
        density="medium"
      />
      <Face pts={rect(70, 38, 180, 94)} />
      <Face pts={rect(62, 30, 196, 8)} density="dense" angle={0} />
      <path d="M70 46h180" class="art-line art-fine" />
      {/* Fascia with "Vacant". */}
      <Face pts={rect(96, 48, 128, 14)} density="light" angle={0} outline="fine" />
      <path d="M128 49h64v12h-64z" class="art-paper" />
      <text x="160" y="58.5" text-anchor="middle" class="art-text art-sign">
        Vacant
      </text>
      {/* Bare awning frame. */}
      <path d="M84 66h152l8 14H76zM100 66l-4 14M160 66v14M220 66l4 14" class="art-line art-fine" />
      <Hatch pts={rect(70, 80, 180, 4)} density="dense" />
      {/* Papered-over window and a door. */}
      <Face pts={rect(88, 88, 76, 42)} />
      <Hatch pts={rect(90, 90, 72, 38)} density="light" angle={-30} />
      <path d="M126 88v42M88 108h76" class="art-line art-fine" />
      <path d="M86 130h80" class="art-line" />
      <Face pts={rect(186, 88, 46, 44)} density="dense" angle={90} />
      <path d="M192 94h34v32h-34z" class="art-paper" />
      <path d="M192 94h34v32h-34zM220 110v3" class="art-line art-fine" />
      {/* "Available" sign on a post. */}
      <path d="M288 116v16" class="art-line" />
      <Face pts={rect(258, 94, 60, 22)} outline="fine" />
      <path d="M261 97h54v16h-54z" class="art-line art-fine" />
      <text x="288" y="108" text-anchor="middle" class="art-text">
        Available
      </text>
    </Vignette>
  );
}
