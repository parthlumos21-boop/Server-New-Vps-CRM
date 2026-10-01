import { useState, useRef, useEffect } from "react";
import {
  FaEye,
  FaFilePdf,
  FaCheck,
  FaTimes,
  FaClone,
  FaUserFriends,
  FaChevronDown,
} from "react-icons/fa";

interface Quotation {
  id: string;
  quotation_no?: string;
  account_id?: string;
}

interface Props {
  quotation: Quotation;
  onPreview: (id: string) => void;
  onViewPdf: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onClone: (id: string) => void;
  onViewAccount: (accountId: string) => void;
}

export default function QuotationNumberDropdown({
  quotation,
  onPreview,
  onViewPdf,
  onApprove,
  onReject,
  onClone,
  onViewAccount,
}: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-800"
      >
        {quotation.quotation_no}
        <FaChevronDown size={16} />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-56 rounded-lg border bg-white shadow-lg">
          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
            onClick={() => onViewPdf(quotation.id)}
          >
            <FaFilePdf size={16} />
            View As PDF
          </button>

          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
            onClick={() => onPreview(quotation.id)}
          >
            <FaEye size={16} />
            Preview
          </button>

          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
            onClick={() => window.location.href = `/quotations/${quotation.id}`}
          >
            <FaEye size={16} />
            View Quote
          </button>

          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
            onClick={() => onApprove(quotation.id)}
          >
            <FaCheck size={16} />
            Approve Quote
          </button>

          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
            onClick={() => onReject(quotation.id)}
          >
            <FaTimes size={16} />
            Reject Quote
          </button>

          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
            onClick={() => onClone(quotation.id)}
          >
            <FaClone size={16} />
            Clone Quote
          </button>

          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
            onClick={() => onViewAccount(quotation.account_id ?? '')}
          >
            <FaUserFriends size={16} />
            View Account
          </button>
        </div>
      )}
    </div>
  );
}