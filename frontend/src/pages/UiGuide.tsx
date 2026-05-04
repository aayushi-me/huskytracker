// src/pages/UiGuide.tsx
import { useState } from "react";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import EventCard from "../components/ui/EventCard";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import Skeleton from "../components/ui/Skeleton";

import { useToast } from "../hooks/useToast";
import { events } from "../data/events";

export default function UiGuide() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sampleEvent = events[0];

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Page Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
          Design System / UI Guide
        </h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl">
          This page documents the shared UI components used in HuskyTrack:
          buttons, inputs, cards, modals, toasts, loaders, and more. It serves
          as an internal “mini Storybook” for the team.
        </p>
      </header>

      {/* Buttons Section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Buttons</h2>
        <p className="text-sm text-gray-600 mb-4">
          Variants: primary, secondary, outline, danger, ghost. Sizes: sm, md, lg.
          Supports loading and fullWidth states.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button isLoading>Loading...</Button>
          <Button fullWidth className="max-w-xs">
            Full width
          </Button>
        </div>
      </section>

      {/* Inputs Section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Inputs</h2>
        <p className="text-sm text-gray-600 mb-4">
          Basic text input component with label, focus ring, and accessibility
          via linked label and generated id.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <Input label="Email" type="email" placeholder="student@northeastern.edu" />
          <Input label="Password" type="password" placeholder="Enter your password" />
        </div>
      </section>

      {/* Card / Event Card Section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Event Card</h2>
        <p className="text-sm text-gray-600 mb-4">
          Reusable card used across Dashboard and Events Page. Clicking navigates
          to /app/events/:id with keyboard and mouse support.
        </p>

        <div className="max-w-sm">
          <EventCard event={sampleEvent} />
        </div>
      </section>

      {/* Modal Section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Modal</h2>
        <p className="text-sm text-gray-600 mb-4">
          Accessible modal with ESC-to-close, backdrop click, focus handling,
          and fade-in animation. Reused for event registration and confirmations.
        </p>

        <Button onClick={() => setIsModalOpen(true)}>Open Sample Modal</Button>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Sample Modal"
        >
          <p className="text-sm text-gray-700 mb-4">
            This is a reusable modal component. It can wrap any content such as
            forms, confirmations, or event registration UI.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Modal primary action clicked!");
                setIsModalOpen(false);
              }}
            >
              Confirm
            </Button>
          </div>
        </Modal>
      </section>

      {/* Toast Section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Toast Notifications</h2>
        <p className="text-sm text-gray-600 mb-4">
          Global toast system with success, error, info, and warning variants.
          Used for form submissions, registration, and error handling.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => toast.success("Success toast example!")}>
            Success
          </Button>
          <Button variant="outline" onClick={() => toast.error("Error toast example!")}>
            Error
          </Button>
          <Button variant="ghost" onClick={() => toast.info("Info toast example!")}>
            Info
          </Button>
          <Button variant="danger" onClick={() => toast.warning("Warning toast example!")}>
            Warning
          </Button>
        </div>
      </section>

      {/* Loaders Section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Loaders (Spinner & Skeleton)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Spinner is used for blocking actions; Skeletons are used as placeholders
          while loading events, event details, or profile data.
        </p>

        <div className="flex flex-wrap items-center gap-8">
          {/* Spinner */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">Spinner</p>
            <Spinner size={32} />
          </div>

          {/* Skeleton example */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">Skeleton card example</p>
            <div className="w-64 space-y-3">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
