import { createPortal } from 'react-dom';

/**
 * ModalPortal — renders children into #modal-root (body level).
 * This ensures modals escape any CSS stacking context created by
 * the sidebar/layout (z-index, transform, filter, etc.) and always
 * render above everything on the page.
 */
const ModalPortal = ({ children }) => {
  const el = document.getElementById('modal-root');
  if (!el) return null;
  return createPortal(children, el);
};

export default ModalPortal;
