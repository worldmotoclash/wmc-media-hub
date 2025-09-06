
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import InvestDialog from "./InvestDialog";
import { BookUser, Gift } from "lucide-react";

const AVAILABLE_TIERS = [
  {
    name: "Race Team Partner",
    icon: <BookUser className="h-7 w-7 text-violet-500" aria-hidden="true" />,
    investment: "$25,000+",
    equity: "0.00250%",
    perks: [
      "All previous perks",
      "Join strategy polls for marketing/brand decisions",
      "Listed as Race Team Supporter",
    ],
    bg: "bg-violet-50 dark:bg-gray-800/70",
    border: "border-violet-200 dark:border-violet-700",
    iconBg: "bg-violet-100 dark:bg-violet-900",
  },
  {
    name: "Legend Tier",
    icon: <Gift className="h-7 w-7 text-purple-700" aria-hidden="true" />,
    investment: "$50,000+",
    equity: "0.00500%",
    perks: [
      "All previous perks",
      "Full hospitality at 2025 premiere event",
      "Lifetime VIP WMC Access Badge (all future races)",
    ],
    bg: "bg-purple-50 dark:bg-gray-800/70",
    border: "border-purple-200 dark:border-purple-700",
    iconBg: "bg-purple-100 dark:bg-purple-900",
    highlight: true,
  },
];

interface AvailableTiersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AvailableTiersDialog: React.FC<AvailableTiersDialogProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="relative">
          <DialogTitle>Available Investment Tiers</DialogTitle>
          <DialogDescription>
            Select from our currently available premium investment tiers below
          </DialogDescription>
          <DialogClose className="absolute right-0 top-0" asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {AVAILABLE_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-2xl border ${tier.border} shadow-md items-stretch p-6 relative
               ${tier.bg} ${tier.highlight ? "ring-2 ring-purple-400 dark:ring-purple-700" : ""}`}
            >
              <div
                className={`flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-3 ${tier.iconBg}`}
              >
                {tier.icon}
              </div>
              <div className="text-center">
                <div className="font-extrabold text-lg mb-1 text-brand-gradient">
                  {tier.name}
                </div>
                <div className="font-semibold text-gray-900 dark:text-white text-2xl mb-1">
                  {tier.investment}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-300 mb-2 font-mono tracking-wide">
                  {tier.equity} Equity
                </div>
              </div>
              <ul className="flex flex-col gap-1 text-gray-700 dark:text-gray-300 text-[0.97rem] mt-2 mb-4 px-1">
                {tier.perks.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="inline-block mt-2 w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full flex-shrink-0"></span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <InvestDialog
                defaultTier={tier.name}
                onAfterSubmit={() => onOpenChange(false)}
                trigger={
                  <Button
                    size="sm"
                    className={`mt-auto font-semibold w-full ${
                      tier.highlight
                        ? "bg-purple-700 hover:bg-purple-800 text-white"
                        : "bg-white/80 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    Select
                  </Button>
                }
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvailableTiersDialog;
