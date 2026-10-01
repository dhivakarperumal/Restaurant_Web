import { LogOut, X } from "lucide-react";
import ModalPortal from "./ModalPortal";

const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <ModalPortal>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1b2925]/55 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#dfd6ca] bg-[#fffdf9] p-6 shadow-[0_24px_70px_rgba(27,41,37,0.24)] sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fae5e2] text-[#c24130]">
              <LogOut size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b87840]">
                Account
              </p>
              <h2 id="logout-confirm-title" className="mt-1 font-serif text-2xl font-semibold text-[#1b2925]">
                Sign out now?
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#7b8580] transition hover:bg-[#f4eee6] hover:text-[#1b2925]"
            aria-label="Close sign out confirmation"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-5 text-sm leading-6 text-[#68736e]">
          You can sign back in anytime to continue managing your orders and saved details.
        </p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#dfd6ca] px-5 py-2.5 text-sm font-semibold text-[#4a5550] transition hover:bg-[#f8f6f1]"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c24130] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a93627]"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);

export default LogoutConfirmModal;