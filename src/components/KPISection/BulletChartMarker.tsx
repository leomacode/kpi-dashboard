import styled from "styled-components";

type Props = {
  style?: React.CSSProperties;
  "aria-label"?: string;
};

// ─── Styled Components ───────────────────────────────────────────────────────

const StyledMarkerRoot = styled.div`
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  pointer-events: none;
`;

const StyledMarkerIcon = styled.svg`
  position: absolute;
  top: 50%;
  left: 0;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 2px 6px var(--shadow-needle-color));
`;

// ─── Component ───────────────────────────────────────────────────────────────

const BulletChartMarker = ({ style, ...rest }: Props) => (
  <StyledMarkerRoot style={style} {...rest}>
    <StyledMarkerIcon
      width="12"
      height="24"
      viewBox="0 0 12 24"
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        points="6,0 12,12 6,24 0,12"
        fill="var(--marker-fill)"
        stroke="var(--color-stroke)"
        strokeWidth="1.5"
      />
    </StyledMarkerIcon>
  </StyledMarkerRoot>
);

export default BulletChartMarker;
