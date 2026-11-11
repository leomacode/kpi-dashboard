import {
  useMemo,
  useCallback,
  useEffect,
  useState,
  useRef,
  useId,
} from "react";
import styled, { css } from "styled-components";
import type { KPIViewModel } from "./types";
import {
  buildBulletChartRanges,
  getTierMetaByValue,
} from "./bulletChartRangeUtils";
import { formatValue } from "./format";

type Props = {
  kpi: KPIViewModel;
  onClose: () => void;
  onPlanValueChange: (value: number | null) => void;
};

// ─── Styled Components ───────────────────────────────────────────────────────

const tierStyles = css`
  &[data-tier="platinum"] {
    color: var(--tier-platinum-text);
    background: var(--tier-platinum-bg);
    border-color: var(--tier-platinum);
  }
  &[data-tier="gold"] {
    color: var(--tier-gold-text);
    background: var(--tier-gold-bg);
    border-color: var(--tier-gold);
  }
  &[data-tier="silver"] {
    color: var(--tier-silver-text);
    background: var(--tier-silver-bg);
    border-color: var(--tier-silver);
  }
  &[data-tier="bronze"] {
    color: var(--tier-bronze-text);
    background: var(--tier-bronze-bg);
    border-color: var(--tier-bronze);
  }
  &[data-tier="minimum"] {
    color: var(--tier-minimum-text);
    background: var(--tier-minimum-bg);
    border-color: var(--color-border);
  }
`;

// Native modal <dialog>: the browser provides the top layer, Esc handling
// (as a cancel event), inert background and focus containment. The dialog
// itself covers the viewport so a click on its padding is a backdrop click.
const StyledDialog = styled.dialog`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  border: 0;
  padding: 1rem;
  background: transparent;

  &[open] {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &::backdrop {
    background: var(--overlay-bg);
  }
`;

const StyledModal = styled.div`
  width: 100%;
  max-width: 45rem;
  max-height: 90vh;
  overflow: auto;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
`;

const StyledModalHeader = styled.div`
  position: sticky;
  top: 0;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 1.125rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const StyledModalTitle = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-primary);
`;

const StyledCloseBtn = styled.button`
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  background: transparent;
  border-radius: 0.625rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--color-text-muted);
  &:hover {
    background: var(--tier-minimum-bg);
    color: var(--color-mid);
  }
`;

const StyledModalBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
`;

const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  @media (max-width: 42.5rem) {
    grid-template-columns: 1fr;
  }
`;

const StyledCard = styled.div<{ $variant?: "status" | "plan" }>`
  border: 1px solid
    ${(p) =>
      p.$variant === "status"
        ? "var(--color-status-border)"
        : "var(--color-border)"};
  border-radius: var(--radius-lg);
  padding: 0.875rem;
  background: ${(p) =>
    p.$variant === "status"
      ? "var(--color-status-bg)"
      : "var(--color-bg-card)"};

  .label {
    font-size: 0.75rem;
    font-weight: 700;
    color: ${(p) =>
      p.$variant === "status"
        ? "var(--tier-platinum-text)"
        : "var(--color-text-secondary)"};
    margin-bottom: 0.25rem;
  }
  .value {
    font-size: 1.75rem;
    font-weight: 800;
    color: ${(p) =>
      p.$variant === "status"
        ? "var(--color-accent-dark)"
        : "var(--color-text-primary)"};
  }
  .unit {
    font-size: 1rem;
    font-weight: 600;
    opacity: 0.8;
    color: ${(p) =>
      p.$variant === "status"
        ? "var(--color-accent-dark)"
        : "var(--color-text-muted)"};
  }
`;

const StyledTierBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 700;
  border: 1px solid transparent;
  margin-top: 0.5rem;
  ${tierStyles}
`;

const StyledPlanHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const StyledPlanTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
`;

const StyledIconBtn = styled.button`
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: var(--radius-lg);
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  &:hover {
    background: var(--tier-minimum-bg);
    color: var(--color-mid);
  }
  &[data-variant="primary"] {
    background: var(--color-accent-dark);
    color: var(--color-bg-card);
    &:hover {
      background: var(--color-accent-darker);
    }
  }
`;

const StyledEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const StyledInput = styled.input`
  width: 100%;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-text-primary);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-lg);
  padding: 0.25rem 0.5rem;
  outline: none;
  background: var(--color-hover-bg);
  &:focus {
    border-color: var(--color-accent-dark);
  }
`;

const StyledSectionTitle = styled.div`
  font-size: 0.8125rem;
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
`;

const StyledInfoBox = styled.div`
  background: var(--color-info-bg);
  border: 1px solid var(--color-info-border);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.125rem;
  color: var(--color-info-text);
`;

const StyledRanges = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StyledRangeRow = styled.div`
  border-radius: var(--radius-lg);
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  ${tierStyles}
  .label {
    font-size: 0.8125rem;
    font-weight: 800;
    margin: 0;
  }
  .desc {
    font-size: 0.75rem;
    opacity: 0.7;
    margin-top: 0.125rem;
  }
  .range {
    font-size: 0.8125rem;
    font-weight: 800;
    text-align: right;
  }
  .unit {
    font-size: 0.75rem;
    font-weight: 600;
    opacity: 0.7;
  }
`;

const StyledFooter = styled.div`
  border-top: 1px solid var(--color-border);
  padding: 0.875rem 1.125rem;
  background: var(--color-hover-bg);
`;

const StyledFooterBtn = styled.button`
  width: 100%;
  border: 0;
  background: var(--color-accent-dark);
  color: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9375rem;
  &:hover {
    background: var(--color-accent-darker);
  }
`;

// ─── Component ───────────────────────────────────────────────────────────────

const BulletChartDetailModal = ({ kpi, onClose, onPlanValueChange }: Props) => {
  const currentTier = useMemo(() => getTierMetaByValue(kpi), [kpi]);
  const { segments } = useMemo(() => buildBulletChartRanges(kpi), [kpi]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const [isEditing, setIsEditing] = useState(false);

  // inputValue is a LOCAL draft — only used while editing.
  // It is initialised fresh each time the user clicks ✏️, from the current kpi.planValue.
  const [inputValue, setInputValue] = useState<string>("");

  const handleStartEdit = useCallback(() => {
    // Seed the input with the current plan value when opening the editor
    setInputValue(kpi.planValue != null ? String(kpi.planValue) : "");
    setIsEditing(true);
  }, [kpi.planValue]);

  const handleSave = useCallback(() => {
    const parsed = parseFloat(inputValue);
    const newValue = Number.isFinite(parsed) ? parsed : null;
    onPlanValueChange(newValue); // push up to KPISection
    setIsEditing(false); // exit edit mode — display reads kpi.planValue (now updated)
  }, [inputValue, onPlanValueChange]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSave();
      if (e.key === "Escape") {
        // Handled here: stop the dialog from also receiving a cancel request
        // for this keypress, which would close it right after the edit ends.
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  // Esc fires `cancel` on a modal dialog. Prevent the browser from closing
  // it so React state stays the source of truth: Esc cancels an edit first,
  // and only closes the dialog when nothing is being edited.
  const handleCancelEvent = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isEditing) handleCancel();
    else onClose();
  };

  // Open as a modal on mount, close on unmount. Focus moves into the dialog
  // on showModal() and is returned explicitly on unmount, because the
  // element is removed rather than closed by the user.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialog.showModal();
    // showModal() focuses the first focusable element, which in Chrome is
    // the scrollable modal body (scrollers are focusable). Start on the
    // close button instead, as before.
    closeButtonRef.current?.focus();
    return () => {
      dialog.close();
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget) return;
      // While editing, ignore backdrop clicks so an accidental click outside
      // does not silently discard the user's draft plan value.
      if (isEditing) return;
      onClose();
    },
    [onClose, isEditing],
  );

  return (
    <StyledDialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancelEvent}
      // A browser may still force-close (e.g. repeated Esc); keep React in
      // sync. `close` is dispatched asynchronously, so ignore a stale one
      // that arrives after the dialog was shown again (StrictMode remount).
      onClose={() => {
        if (!dialogRef.current?.open) onClose();
      }}
      onClick={handleOverlayClick}
    >
      <StyledModal>
        <StyledModalHeader>
          <StyledModalTitle id={titleId}>{kpi.name}</StyledModalTitle>
          <StyledCloseBtn
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </StyledCloseBtn>
        </StyledModalHeader>

        <StyledModalBody>
          <StyledGrid>
            <StyledCard $variant="status">
              <div className="label">Current Status</div>
              <div className="value">
                {formatValue(kpi.value)}
                <span className="unit"> {kpi.unit}</span>
              </div>
              <StyledTierBadge data-tier={currentTier.colorKey}>
                {currentTier.name}
              </StyledTierBadge>
            </StyledCard>

            <StyledCard $variant="plan">
              <StyledPlanHeader>
                <StyledPlanTitle>Target (Plan)</StyledPlanTitle>
                {!isEditing && (
                  <StyledIconBtn
                    type="button"
                    onClick={handleStartEdit}
                    aria-label="Edit plan value"
                    title="Edit target"
                  >
                    ✏️
                  </StyledIconBtn>
                )}
              </StyledPlanHeader>

              {isEditing ? (
                <StyledEditRow>
                  <StyledInput
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- input is only rendered when user clicks Edit; auto-focusing the input is the expected interaction inside the open dialog
                    autoFocus
                    placeholder="Enter value"
                  />
                  <StyledIconBtn
                    type="button"
                    onClick={handleSave}
                    data-variant="primary"
                    aria-label="Save"
                  >
                    ✓
                  </StyledIconBtn>
                  <StyledIconBtn
                    type="button"
                    onClick={handleCancel}
                    aria-label="Cancel"
                  >
                    ✕
                  </StyledIconBtn>
                </StyledEditRow>
              ) : (
                // Always read from kpi.planValue — this is the prop passed down
                // from KPISection which holds the up-to-date value after saving.
                <div className="value">
                  {kpi.planValue == null ? "-" : formatValue(kpi.planValue)}
                  <span className="unit"> {kpi.unit}</span>
                </div>
              )}
            </StyledCard>
          </StyledGrid>

          {kpi.explanation && (
            <div>
              <StyledSectionTitle>
                ℹ What does this KPI mean?
              </StyledSectionTitle>
              <StyledInfoBox>{kpi.explanation}</StyledInfoBox>
            </div>
          )}

          <div>
            <StyledSectionTitle>Performance Score</StyledSectionTitle>
            <StyledRanges>
              {segments.map((s) => (
                <StyledRangeRow key={s.key} data-tier={s.colorKey}>
                  <div>
                    <div className="label">{s.label}</div>
                    <div className="desc">{s.description}</div>
                  </div>
                  <div className="range">
                    {s.modalRange} <span className="unit">{kpi.unit}</span>
                  </div>
                </StyledRangeRow>
              ))}
            </StyledRanges>
          </div>
        </StyledModalBody>

        <StyledFooter>
          <StyledFooterBtn type="button" onClick={onClose}>
            Close
          </StyledFooterBtn>
        </StyledFooter>
      </StyledModal>
    </StyledDialog>
  );
};

BulletChartDetailModal.displayName = "BulletChartDetailModal";

export default BulletChartDetailModal;
