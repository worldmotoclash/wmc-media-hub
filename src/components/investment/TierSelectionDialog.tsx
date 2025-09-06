
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge, Gift, Trophy, Users, BadgeCheck, BookUser } from 'lucide-react';
import { Card } from '@/components/ui/card';
import InvestDialog from './InvestDialog';

interface TierSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIERS = [
  {
    name: "Pit Pass",
    icon: <Badge className="h-7 w-7 text-cyan-500" aria-hidden="true" />,
    investment: "$1,000+",
    bg: "bg-cyan-50 dark:bg-gray-800/70",
  },
  {
    name: "Grid Position",
    icon: <Users className="h-7 w-7 text-emerald-500" aria-hidden="true" />,
    investment: "$2,500+",
    bg: "bg-emerald-50 dark:bg-gray-800/70",
  },
  {
    name: "Clash Elite",
    icon: <BadgeCheck className="h-7 w-7 text-amber-400" aria-hidden="true" />,
    investment: "$5,000+",
    bg: "bg-amber-50 dark:bg-gray-800/70",
  },
  {
    name: "Founding Sponsor",
    icon: <Trophy className="h-7 w-7 text-red-500" aria-hidden="true" />,
    investment: "$10,000+",
    bg: "bg-red-50 dark:bg-gray-800/70",
  },
  {
    name: "Race Team Partner",
    icon: <BookUser className="h-7 w-7 text-violet-500" aria-hidden="true" />,
    investment: "$25,000+",
    bg: "bg-violet-50 dark:bg-gray-800/70",
  },
  {
    name: "Legend Tier",
    icon: <Gift className="h-7 w-7 text-purple-700" aria-hidden="true" />,
    investment: "$50,000+",
    bg: "bg-purple-50 dark:bg-gray-800/70",
  },
];

const TierSelectionDialog: React.FC<TierSelectionDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center mb-6">
            Select Your Investment Tier
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <InvestDialog
              key={tier.name}
              defaultTier={tier.name}
              trigger={
                <Card className={`${tier.bg} p-6 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform`}>
                  <div className="p-3 bg-white rounded-full mb-4 dark:bg-gray-700">
                    {tier.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{tier.name}</h3>
                  <p className="text-xl font-semibold">{tier.investment}</p>
                </Card>
              }
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TierSelectionDialog;
