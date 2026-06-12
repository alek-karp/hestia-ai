"use client";

import { createContext, useContext, useState } from "react";

export interface EventPlanData {
  title: string;
  date: string;
  area: string;
  headcount: number;
  isDispatching: boolean;
  venue?: { name: string; detail: string; url?: string };
  catering?: { name: string; detail: string; url?: string };
  lumaEvent?: { url: string; title: string };
}

interface BookingPanelContextValue {
  panelOpen: boolean;
  hasPlan: boolean;
  eventPlan: EventPlanData | null;
  togglePanel: () => void;
  closePanel: () => void;
  setHasPlan: (v: boolean) => void;
  setEventPlan: (plan: EventPlanData | null) => void;
}

const BookingPanelContext = createContext<BookingPanelContextValue>({
  panelOpen: false,
  hasPlan: false,
  eventPlan: null,
  togglePanel: () => {},
  closePanel: () => {},
  setHasPlan: () => {},
  setEventPlan: () => {},
});

export function BookingPanelProvider({ children }: { children: React.ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  return (
    <BookingPanelContext.Provider
      value={{
        panelOpen,
        hasPlan,
        eventPlan,
        togglePanel: () => setPanelOpen((v) => !v),
        closePanel: () => setPanelOpen(false),
        setHasPlan,
        setEventPlan,
      }}
    >
      {children}
    </BookingPanelContext.Provider>
  );
}

export function useBookingPanel() {
  return useContext(BookingPanelContext);
}
