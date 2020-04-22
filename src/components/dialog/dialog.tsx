import { Component, Event, EventEmitter, Method, Prop, State, h } from '@stencil/core';
import { KeyboardDetector } from '../../utilities/keyboard-detector';

let id = 0;

/**
 * @slot - The dialog's content.
 * @slot footer - The dialog's footer, usually one or more buttons representing various actions.
 */
@Component({
  tag: 'sl-dialog',
  styleUrl: 'dialog.scss',
  shadow: true
})
export class Dialog {
  bodyOverflow = '';
  box: HTMLElement;
  overlay: HTMLElement;
  dialog: HTMLElement;
  id = `sl-dialog-${++id}`;
  keyboardDetector: KeyboardDetector;

  constructor() {
    this.keepDialogFocused = this.keepDialogFocused.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
    this.handleTransitionEnd = this.handleTransitionEnd.bind(this);
    this.handleDocumentKeyDown = this.handleDocumentKeyDown.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
  }

  @State() isOpen = false;
  @State() isUsingKeyboard = false;

  /**
   * The dialog's label as displayed in the header. You should always include a relevant label even when using
   * `no-header`, as it is required for proper accessibility.
   */
  @Prop() label = '';

  /** When true, clicking on the overlay will close the dialog. */
  @Prop() closeOnClick = false;

  /**
   * Set to true to disable the header. This will also remove the default close button, so please ensure you provide an
   * easy, accessible way for users to dismiss the dialog.
   */
  @Prop() noHeader = false;

  /** Set to true to disable the footer. */
  @Prop() noFooter = false;

  /** Emitted when the dialog menu opens. Calling `event.preventDefault()` will prevent it from being opened. */
  @Event() slOpen: EventEmitter;

  /** Emitted after the dialog opens and all transitions are complete. */
  @Event() slAfterOpen: EventEmitter;

  /** Emitted when the dialog menu closes. Calling `event.preventDefault()` will prevent it from being closed. */
  @Event() slClose: EventEmitter;

  /** Emitted after the dialog closes and all transitions are complete. */
  @Event() slAfterClose: EventEmitter;

  componentDidLoad() {
    this.keyboardDetector = new KeyboardDetector({
      whenUsing: () => (this.isUsingKeyboard = true),
      whenNotUsing: () => (this.isUsingKeyboard = false)
    });
    this.keyboardDetector.observe(this.dialog);
  }

  componentDidUnload() {
    this.keyboardDetector.unobserve(this.dialog);
  }

  /** Opens the dialog */
  @Method()
  async open() {
    const slOpen = this.slOpen.emit();

    if (slOpen.defaultPrevented) {
      return false;
    }

    this.dialog.hidden = false;
    this.isOpen = true;
    this.box.focus();

    // Lock body scrolling
    this.bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', this.handleDocumentKeyDown);
    document.addEventListener('focusin', this.keepDialogFocused);
  }

  /** Closes the dialog */
  @Method()
  async close() {
    const slClose = this.slClose.emit();

    if (slClose.defaultPrevented) {
      return false;
    }

    this.isOpen = false;

    // Unlock body scrolling
    document.body.style.overflow = this.bodyOverflow;

    document.removeEventListener('keydown', this.handleDocumentKeyDown);
    document.removeEventListener('focusin', this.keepDialogFocused);
  }

  handleCloseClick() {
    this.close();
  }

  handleDocumentKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  handleOverlayClick() {
    if (this.closeOnClick) {
      this.close();
    }
  }

  handleTransitionEnd(event: TransitionEvent) {
    const target = event.target as HTMLElement;

    this.dialog.hidden = !this.isOpen;

    // Ensure we only handle one transition event
    if (event.propertyName === 'opacity' && target.classList.contains('sl-dialog__box')) {
      this.isOpen ? this.slAfterOpen.emit() : this.slAfterClose.emit();
    }
  }

  keepDialogFocused(event: Event) {
    const target = event.target as HTMLElement;

    if (!target.closest('sl-dialog')) {
      this.box.focus();
    }
  }

  render() {
    return (
      <div
        ref={el => (this.dialog = el)}
        class={{
          'sl-dialog': true,
          'sl-dialog--open': this.isOpen,
          'sl-dialog--using-keyboard': this.isUsingKeyboard
        }}
        onTransitionEnd={this.handleTransitionEnd}
        hidden
      >
        <div
          ref={el => (this.box = el)}
          class="sl-dialog__box"
          role="dialog"
          aria-modal="true"
          aria-hidden={!this.isOpen}
          aria-label={this.noHeader ? this.label : null}
          aria-labeledby={!this.noHeader ? `${this.id}-title` : null}
          tabIndex={0}
        >
          {!this.noHeader && (
            <div class="sl-dialog__header">
              <span class="sl-dialog__title" id={`${this.id}-title`}>
                {/* If there's no label, use an invisible character to prevent the heading from collapsing */}
                {this.label || String.fromCharCode(65279)}
              </span>
              <button class="sl-dialog__close" type="button" onClick={this.handleCloseClick}>
                <sl-icon name="x"></sl-icon>
              </button>
            </div>
          )}

          <div class="sl-dialog__body">
            <slot />
          </div>

          {!this.noFooter && (
            <div class="sl-dialog__footer">
              <slot name="footer" />
            </div>
          )}
        </div>

        <div ref={el => (this.overlay = el)} class="sl-dialog__overlay" onClick={this.handleOverlayClick} />
      </div>
    );
  }
}