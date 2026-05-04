import React, { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { RichTextEditor } from "../ui/RichTextEditor";
import { useToast } from "../../hooks/useToast";
import { useUnsavedChangesWarning } from "../../hooks/useUnsavedChangesWarning";
import { EventFormValues, EventCategory } from "../../types/events";

// --------------------------------------------------------
// Types
// --------------------------------------------------------
type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initialValues?: EventFormValues;
  onSubmit: (
    values: EventFormValues,
    action: "draft" | "publish"
  ) => Promise<void>;
}

type Errors = Partial<Record<keyof EventFormValues, string>> & {
  startEnd?: string;
  location?: string;
};

// --------------------------------------------------------
// Constants
// --------------------------------------------------------
const TITLE_MAX = 100;

const CATEGORY_OPTIONS: EventCategory[] = [
  "workshop",
  "seminar",
  "cultural",
  "sports",
];

// --------------------------------------------------------
// Component
// --------------------------------------------------------
export default function EventForm({ mode, initialValues, onSubmit }: Props) {
  const { showToast } = useToast();

  const [values, setValues] = useState<EventFormValues>(
    initialValues ?? {
      title: "",
      description: "",
      category: "",
      tags: [],
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      location: {
        venue: "",
        address: "",
        room: "",
        latitude: null,
        longitude: null,
      },
      capacity: null,
      requiresApproval: false,
      imageFile: undefined,
      imageUrl: undefined,
    }
  );

  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    initialValues?.imageUrl ?? undefined

  );

  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(
    JSON.stringify(initialValues ?? values)
  );

  const isDirty = useMemo(
    () => JSON.stringify(values) !== lastSavedSnapshot,
    [values, lastSavedSnapshot]
  );

  useUnsavedChangesWarning(isDirty && !submitting);

  // When editing: load initial values
  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
      setImagePreview(initialValues.imageUrl ?? undefined);
      setLastSavedSnapshot(JSON.stringify(initialValues));
    }
  }, [initialValues]);

  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------
  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleChange =
    (field: keyof EventFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "capacity"
          ? e.target.value === ""
            ? null
            : Number(e.target.value)
          : e.target.value;

      setValues((prev) => ({ ...prev, [field]: value as any }));
    };

  const handleLocationChange =
    (field: keyof EventFormValues["location"]) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value: string | number | null = e.target.value;

      if (field === "latitude" || field === "longitude") {
        value = value === "" ? null : Number(value);
      }

      setValues((prev) => ({
        ...prev,
        location: { ...prev.location, [field]: value },
      }));
    };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValues((prev) => ({ ...prev, category: e.target.value as EventCategory }));
  };

  const handleDescriptionChange = (html: string) => {
    setValues((prev) => ({ ...prev, description: html }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const input = (e.target as HTMLInputElement).value.trim();

      if (input && !values.tags.includes(input)) {
        setValues((prev) => ({ ...prev, tags: [...prev.tags, input] }));
      }

      (e.target as HTMLInputElement).value = "";
    }
  };

  const removeTag = (tag: string) => {
    setValues((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;

    setValues((prev) => ({ ...prev, imageFile: file }));

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageChange(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();

  // --------------------------------------------------------
  // Validation
  // --------------------------------------------------------
  const validate = (): Errors => {
    const newErrors: Errors = {};

    if (!values.title.trim()) newErrors.title = "Title is required.";
    else if (values.title.length > TITLE_MAX)
      newErrors.title = `Max ${TITLE_MAX} characters.`;

    if (
      !values.description ||
      values.description.trim() === "" ||
      values.description === "<p></p>"
    ) {
      newErrors.description = "Description is required.";
    }

    if (!values.category) newErrors.category = "Category required.";

    if (!values.startDate || !values.startTime)
      newErrors.startDate = "Start required.";

    if (!values.endDate || !values.endTime)
      newErrors.endDate = "End required.";

    if (values.startDate && values.startTime && values.endDate && values.endTime) {
      try {
        // Parse dates consistently with backend
        // dateStr is "YYYY-MM-DD", timeStr is "HH:mm"
        const parseDateTime = (dateStr: string, timeStr: string): Date => {
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hours, minutes] = timeStr.split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes, 0, 0);
        };
        
        const start = parseDateTime(values.startDate, values.startTime);
        const end = parseDateTime(values.endDate, values.endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          newErrors.startEnd = "Invalid date or time format.";
        } else if (end.getTime() <= start.getTime()) {
          newErrors.startEnd = "End must be after start.";
        } else {
          // Only check minimum duration (30 minutes) if event is on the same date
          // For multi-day events, we only require that end date is after start date
          const isSameDate = values.startDate === values.endDate;
          if (isSameDate) {
            const durationMs = end.getTime() - start.getTime();
            const minDurationMs = 30 * 60 * 1000;
            if (durationMs < minDurationMs) {
              newErrors.startEnd = "Event must be at least 30 minutes long.";
            }
          }
        }
      } catch (err) {
        newErrors.startEnd = "Invalid date or time format.";
      }
    }

    if (!values.location.venue.trim())
      newErrors.location = "Venue is required.";

    if (values.capacity != null && values.capacity <= 0)
      newErrors.capacity = "Must be greater than 0.";

    return newErrors;
  };

  // --------------------------------------------------------
  // Submit
  // --------------------------------------------------------
  const handleSubmit = async (action: "draft" | "publish") => {
    const v = validate();
    setErrors(v);

    if (Object.keys(v).length > 0) {
      showToast("Fix errors before submitting.", "error");
      return;
    }

    try {
      setSubmitting(true);

      await onSubmit(values, action);

      setLastSavedSnapshot(JSON.stringify(values));

      showToast(
        action === "draft"
          ? "Draft saved."
          : mode === "create"
          ? "Event published."
          : "Event updated.",
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || "Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------
  // Render UI
  // --------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* --------------------------------------------- */}
      {/* BASIC INFO */}
      {/* --------------------------------------------- */}
      <section className="bg-white shadow-sm rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">
            Event Title <span className="text-red-500">*</span>
          </label>

          <Input
            value={values.title}
            onChange={handleChange("title")}
            onBlur={() => markTouched("title")}
            placeholder="e.g., Husky Welcome Mixer"
            className={touched.title && errors.title ? "border-red-500" : ""}
          />

          <div className="flex justify-between text-xs mt-1">
            <span className="text-red-500">{touched.title && errors.title}</span>
            <span>
              {values.title.length}/{TITLE_MAX}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* CATEGORY */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Category <span className="text-red-500">*</span>
            </label>

            <select
              value={values.category}
              onChange={handleCategoryChange}
              onBlur={() => markTouched("category")}
              className={`w-full border rounded-lg p-2 ${
                touched.category && errors.category ? "border-red-500" : ""
              }`}
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            {touched.category && errors.category && (
              <p className="text-xs text-red-500">{errors.category}</p>
            )}
          </div>

          {/* TAGS */}
          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>

            <div className="flex flex-wrap gap-2 mb-2">
              {values.tags.map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="px-3 py-1 text-xs rounded-full bg-primary/5 text-primary flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80"
                    onClick={() => removeTag(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <Input
              placeholder="Press Enter to add tag"
              onKeyDown={handleTagKeyDown}
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------- */}
      {/* SCHEDULE */}
      {/* --------------------------------------------- */}
      <section className="bg-white shadow-sm rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Schedule</h3>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Start Date */}
          <div>
            <label className="text-xs font-medium">Start Date *</label>
            <Input
              type="date"
              value={values.startDate}
              onChange={handleChange("startDate")}
              onBlur={() => markTouched("startDate")}
              className={
                touched.startDate && (errors.startDate || errors.startEnd)
                  ? "border-red-500"
                  : ""
              }
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="text-xs font-medium">Start Time *</label>
            <Input
              type="time"
              value={values.startTime}
              onChange={handleChange("startTime")}
              onBlur={() => markTouched("startTime")}
              className={
                touched.startTime && (errors.startDate || errors.startEnd)
                  ? "border-red-500"
                  : ""
              }
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs font-medium">End Date *</label>
            <Input
              type="date"
              value={values.endDate}
              onChange={handleChange("endDate")}
              onBlur={() => markTouched("endDate")}
              className={
                touched.endDate && (errors.endDate || errors.startEnd)
                  ? "border-red-500"
                  : ""
              }
            />
          </div>

          {/* End Time */}
          <div>
            <label className="text-xs font-medium">End Time *</label>
            <Input
              type="time"
              value={values.endTime}
              onChange={handleChange("endTime")}
              onBlur={() => markTouched("endTime")}
              className={
                touched.endTime && (errors.endDate || errors.startEnd)
                  ? "border-red-500"
                  : ""
              }
            />
          </div>
        </div>

        {errors.startEnd && (
          <p className="text-xs text-red-500">{errors.startEnd}</p>
        )}
      </section>

      {/* --------------------------------------------- */}
      {/* LOCATION */}
      {/* --------------------------------------------- */}
      <section className="bg-white shadow-sm rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Location</h3>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Venue */}
          <div className="md:col-span-2">
            <label className="text-xs font-medium">
              Venue <span className="text-red-500">*</span>
            </label>

            <Input
              value={values.location.venue}
              onChange={handleLocationChange("venue")}
              onBlur={() => markTouched("location")}
              placeholder="Curry Student Center"
              className={
                touched.location && errors.location ? "border-red-500" : ""
              }
            />

            {touched.location && errors.location && (
              <p className="text-xs text-red-500">{errors.location}</p>
            )}
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Address</label>
            <Input
              value={values.location.address}
              onChange={handleLocationChange("address")}
              placeholder="360 Huntington Ave, Boston, MA"
            />
          </div>

          {/* Room */}
          <div>
            <label className="text-xs font-medium">Room</label>
            <Input
              value={values.location.room ?? ""}
              onChange={handleLocationChange("room")}
            />
          </div>

          {/* Lat */}
          <div>
            <label className="text-xs font-medium">Latitude</label>
            <Input
              type="number"
              value={values.location.latitude ?? ""}
              onChange={handleLocationChange("latitude")}
            />
          </div>

          {/* Lng */}
          <div>
            <label className="text-xs font-medium">Longitude</label>
            <Input
              type="number"
              value={values.location.longitude ?? ""}
              onChange={handleLocationChange("longitude")}
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------- */}
      {/* CAPACITY */}
      {/* --------------------------------------------- */}
      <section className="bg-white shadow-sm rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Capacity & Settings</h3>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Capacity */}
          <div>
            <label className="text-xs font-medium">Capacity</label>

            <Input
              type="number"
              value={values.capacity ?? ""}
              onChange={handleChange("capacity")}
              onBlur={() => markTouched("capacity")}
              className={
                touched.capacity && errors.capacity ? "border-red-500" : ""
              }
            />

            {touched.capacity && errors.capacity && (
              <p className="text-xs text-red-500">{errors.capacity}</p>
            )}
          </div>

          {/* Requires Approval */}
          <div className="flex items-center gap-2 mt-6">
            <input
              id="requiresApproval"
              type="checkbox"
              checked={values.requiresApproval}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  requiresApproval: e.target.checked,
                }))
              }
            />
            <label htmlFor="requiresApproval" className="text-sm">
              Requires organizer approval
            </label>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- */}
      {/* DESCRIPTION */}
      {/* --------------------------------------------- */}
      <section className="bg-white shadow-sm rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">
          Description <span className="text-red-500">*</span>
        </h3>

        <RichTextEditor
          value={values.description}
          onChange={handleDescriptionChange}
          error={touched.description && Boolean(errors.description)}
        />

        {touched.description && errors.description && (
          <p className="text-xs text-red-500">{errors.description}</p>
        )}
      </section>

      {/* --------------------------------------------- */}
      {/* IMAGE UPLOAD */}
      {/* --------------------------------------------- */}
      <section className="bg-white shadow-sm rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Event Image</h3>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary/60"
        >
          <input
            type="file"
            id="event-image-upload"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
          />

          <label htmlFor="event-image-upload" className="cursor-pointer">
            <p className="text-sm">
              Drag & drop image or{" "}
              <span className="text-primary">browse</span>
            </p>
          </label>
        </div>

        {imagePreview && (
          <img
            src={imagePreview}
            className="mt-3 w-full max-h-64 rounded-xl object-cover"
          />
        )}
      </section>

      {/* --------------------------------------------- */}
      {/* ACTION BAR */}
      {/* --------------------------------------------- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t px-4 py-3 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {isDirty ? "You have unsaved changes." : "All changes saved."}
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              isLoading={submitting}
              onClick={() => handleSubmit("draft")}
            >
              Save as Draft
            </Button>

            <Button
              variant="primary"
              isLoading={submitting}
              onClick={() => handleSubmit("publish")}
            >
              {mode === "create" ? "Publish Event" : "Save & Update"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
