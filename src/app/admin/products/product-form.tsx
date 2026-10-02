"use client";

import { type ComponentProps, useActionState, useId, useRef, useState } from "react";
import { Field, Spinner } from "@/components/form-field";
import {
  PRODUCT_LIMITS,
  type ProductFieldErrors,
  type ProductFormValues,
  slugify,
} from "@/lib/admin-validation";
import { ONE_SIZE, type ProductImage } from "@/lib/products";
import type { ProductFormState } from "./actions";

type Props = {
  mode: "create" | "update";
  action: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: { id: number; name: string }[];
  initial: ProductFormValues;
};

// Create and edit form. Fields are uncontrolled; after each server response
// the form remounts with the values the server returned, so nothing typed is
// lost on a validation error and saved values show normalized.
export function ProductForm({ mode, action, categories, initial }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [version, setVersion] = useState(0);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setVersion((v) => v + 1);
  }

  const values = state.values ?? initial;
  const errors: ProductFieldErrors = state.fieldErrors ?? {};
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form
      key={version}
      action={formAction}
      noValidate
      aria-busy={pending}
      className="flex flex-col gap-10"
    >
      {(state.error || hasErrors) && (
        <p role="alert" className="text-error">
          {state.error ?? "Check the highlighted fields."}
        </p>
      )}

      <section aria-labelledby="basics-title" className="flex flex-col gap-6">
        <h2 id="basics-title" className="border-b border-ink pb-3 text-label">
          Product
        </h2>
        <NameAndSlug mode={mode} values={values} errors={errors} />
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            name="categoryId"
            label="Category"
            defaultValue={values.categoryId}
            error={errors.categoryId}
          >
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <Field
            name="price"
            label="Price (USD)"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={values.price}
            error={errors.price}
            hint="In dollars, like 1250 or 1250.50."
          />
        </div>
        <Field
          name="badge"
          label="Badge (optional)"
          required={false}
          maxLength={PRODUCT_LIMITS.badge}
          defaultValue={values.badge}
          error={errors.badge}
          hint='Short label on the product card, like "New in".'
        />
      </section>

      <section aria-labelledby="copy-title" className="flex flex-col gap-6">
        <h2 id="copy-title" className="border-b border-ink pb-3 text-label">
          Description
        </h2>
        <TextAreaField
          name="description"
          label="Description"
          rows={5}
          maxLength={PRODUCT_LIMITS.description}
          defaultValue={values.description}
          error={errors.description}
        />
        <TextAreaField
          name="details"
          label="Details (optional)"
          required={false}
          rows={5}
          defaultValue={values.details}
          error={errors.details}
          hint="One per line, like materials, fit or care."
        />
      </section>

      <ImageFields initial={values.images} error={errors.images} />

      {mode === "create" && (
        <section aria-labelledby="sizes-title" className="flex flex-col gap-6">
          <h2 id="sizes-title" className="border-b border-ink pb-3 text-label">
            Sizes
          </h2>
          <Field
            name="sizes"
            label="Sizes (optional)"
            required={false}
            autoComplete="off"
            defaultValue={values.sizes}
            error={errors.sizes}
            hint={`Comma-separated, in display order, like XS, S, M, L. Leave empty for "${ONE_SIZE}". Every size starts with no stock.`}
          />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending && <Spinner />}
          {mode === "create"
            ? pending
              ? "Creating…"
              : "Create product"
            : pending
              ? "Saving…"
              : "Save changes"}
        </button>
        <p role="status" className="text-muted">
          {state.status === "saved" && !pending ? "Changes saved." : ""}
        </p>
      </div>
    </form>
  );
}

// The slug follows the name while creating, until it is edited by hand. It
// can't change after creation (order history and links use it).
function NameAndSlug({
  mode,
  values,
  errors,
}: {
  mode: Props["mode"];
  values: ProductFormValues;
  errors: ProductFieldErrors;
}) {
  const slugRef = useRef<HTMLInputElement>(null);
  const slugEdited = useRef(values.slug !== "" && values.slug !== slugify(values.name));

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field
        name="name"
        label="Name"
        maxLength={PRODUCT_LIMITS.name}
        autoComplete="off"
        defaultValue={values.name}
        error={errors.name}
        onChange={(event) => {
          if (mode === "create" && !slugEdited.current && slugRef.current) {
            slugRef.current.value = slugify(event.currentTarget.value);
          }
        }}
      />
      {mode === "create" ? (
        <Field
          ref={slugRef}
          name="slug"
          label="URL slug"
          maxLength={PRODUCT_LIMITS.slug}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={values.slug}
          error={errors.slug}
          hint="Used in the product URL. It can't be changed later."
          onChange={() => {
            slugEdited.current = true;
          }}
        />
      ) : (
        <Field
          name="slug"
          label="URL slug"
          required={false}
          readOnly
          defaultValue={values.slug}
          hint="Set when the product was created."
        />
      )}
    </div>
  );
}

const EMPTY_IMAGE: ProductImage = { src: "", alt: "" };

function ImageFields({ initial, error }: { initial: ProductImage[]; error?: string }) {
  // Row keys and ids must match between server and client render.
  const idPrefix = useId();
  const [rows, setRows] = useState(() =>
    (initial.length > 0 ? initial : [EMPTY_IMAGE]).map((image, key) => ({ ...image, key })),
  );
  const nextKey = useRef(rows.length);
  const errorId = error ? "field-images-error" : undefined;

  return (
    <fieldset
      aria-describedby={errorId ?? "field-images-hint"}
      className="flex flex-col gap-6"
    >
      <legend className="mb-6 w-full border-b border-ink pb-3 text-label">Images</legend>
      <p id="field-images-hint" className="-mt-2 text-muted">
        The first image is the main one. Use images.unsplash.com photo URLs.
      </p>
      <ol className="flex flex-col gap-6">
        {rows.map((row, index) => (
          <li key={row.key} className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] sm:items-end">
            <div className="flex flex-col gap-2">
              <label htmlFor={`${idPrefix}-src-${row.key}`} className="text-label">
                Image {index + 1} URL
              </label>
              <input
                id={`${idPrefix}-src-${row.key}`}
                name="imageSrc"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                defaultValue={row.src}
                aria-invalid={error ? true : undefined}
                className="field-input"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={`${idPrefix}-alt-${row.key}`} className="text-label">
                Alt text
              </label>
              <input
                id={`${idPrefix}-alt-${row.key}`}
                name="imageAlt"
                maxLength={PRODUCT_LIMITS.alt}
                autoComplete="off"
                defaultValue={row.alt}
                aria-invalid={error ? true : undefined}
                className="field-input"
              />
            </div>
            <button
              type="button"
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              aria-label={`Remove image ${index + 1}`}
              className="btn btn-ghost btn-sm justify-start disabled:invisible sm:h-12"
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
      {error && (
        <p id={errorId} className="text-error">
          {error}
        </p>
      )}
      <div>
        <button
          type="button"
          disabled={rows.length >= PRODUCT_LIMITS.images}
          onClick={() => setRows((current) => [...current, { ...EMPTY_IMAGE, key: nextKey.current++ }])}
          className="btn btn-secondary btn-sm"
        >
          Add image
        </button>
      </div>
    </fieldset>
  );
}

type ExtraFieldProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

function describedBy(name: string, hint?: string, error?: string) {
  return error ? `field-${name}-error` : hint ? `field-${name}-hint` : undefined;
}

function FieldMessage({ name, hint, error }: { name: string; hint?: string; error?: string }) {
  if (error) {
    return (
      <p id={`field-${name}-error`} className="text-error">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`field-${name}-hint`} className="text-muted">
        {hint}
      </p>
    );
  }
  return null;
}

// Same label, error and hint markup as Field, for a select.
function SelectField({
  name,
  label,
  hint,
  error,
  children,
  ...selectProps
}: ExtraFieldProps & Omit<ComponentProps<"select">, "name" | "id">) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`field-${name}`} className="text-label">
        {label}
      </label>
      <select
        id={`field-${name}`}
        name={name}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className="field-input"
        {...selectProps}
      >
        {children}
      </select>
      <FieldMessage name={name} hint={hint} error={error} />
    </div>
  );
}

// Same label, error and hint markup as Field, for a textarea.
function TextAreaField({
  name,
  label,
  hint,
  error,
  ...textAreaProps
}: ExtraFieldProps & Omit<ComponentProps<"textarea">, "name" | "id">) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`field-${name}`} className="text-label">
        {label}
      </label>
      <textarea
        id={`field-${name}`}
        name={name}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className="field-textarea"
        {...textAreaProps}
      />
      <FieldMessage name={name} hint={hint} error={error} />
    </div>
  );
}
