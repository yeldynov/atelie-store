"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Field, Spinner } from "@/components/form-field";
import { CATEGORY_LIMITS, slugify } from "@/lib/admin-validation";
import { ConfirmButton } from "../confirm-button";
import {
  type CategoryFormState,
  createCategory,
  deleteCategory,
  renameCategory,
} from "./actions";

/** Remounts a form after each server response so it shows the returned values. */
function useFormVersion(state: CategoryFormState) {
  const [version, setVersion] = useState(0);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setVersion((v) => v + 1);
  }
  return version;
}

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, {} as CategoryFormState);
  const version = useFormVersion(state);
  const values = state.values ?? { name: "", slug: "" };
  const slugRef = useRef<HTMLInputElement>(null);
  const slugEdited = useRef(false);

  return (
    <form
      key={version}
      action={formAction}
      noValidate
      aria-busy={pending}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
        <Field
          name="name"
          label="Name"
          maxLength={CATEGORY_LIMITS.name}
          autoComplete="off"
          defaultValue={values.name}
          error={state.fieldErrors?.name}
          onChange={(event) => {
            if (!slugEdited.current && slugRef.current) {
              slugRef.current.value = slugify(event.currentTarget.value)
                .slice(0, CATEGORY_LIMITS.slug)
                .replace(/-+$/, "");
            }
          }}
        />
        <Field
          ref={slugRef}
          name="slug"
          label="URL slug"
          maxLength={CATEGORY_LIMITS.slug}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={values.slug}
          error={state.fieldErrors?.slug}
          hint="Used in /collections/… and can't be changed later."
          onChange={() => {
            slugEdited.current = true;
          }}
        />
        <button type="submit" disabled={pending} className="btn btn-primary sm:mt-6">
          {pending && <Spinner />}
          {pending ? "Adding…" : "Add category"}
        </button>
      </div>
      <p role={state.error ? "alert" : "status"} className={state.error ? "text-error" : "text-muted"}>
        {state.error ?? (state.status === "saved" && !pending ? "Category added." : "")}
      </p>
    </form>
  );
}

export function CategoryRow({
  id,
  name,
  slug,
  productCount,
}: {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}) {
  const [renameState, renameAction, renaming] = useActionState(
    renameCategory.bind(null, id),
    {} as CategoryFormState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteCategory.bind(null, id),
    {} as CategoryFormState,
  );
  const version = useFormVersion(renameState);
  const inputId = `category-${id}-name`;
  const nameError = renameState.fieldErrors?.name ?? renameState.error;
  const inUse = productCount > 0;

  return (
    <li className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-8">
      <form key={version} action={renameAction} noValidate aria-busy={renaming} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="sr-only">
          Name of {name}
        </label>
        <div className="flex items-end gap-3">
          <input
            id={inputId}
            name="name"
            required
            maxLength={CATEGORY_LIMITS.name}
            autoComplete="off"
            defaultValue={renameState.values?.name ?? name}
            readOnly={renaming}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={`${inputId}-message`}
            className="field-input min-w-0 flex-1"
          />
          <button type="submit" disabled={renaming} className="btn btn-secondary btn-sm">
            {renaming && <Spinner />}
            {renaming ? "Saving…" : "Rename"}
          </button>
        </div>
        <p
          id={`${inputId}-message`}
          role={nameError ? "alert" : "status"}
          className={nameError ? "text-error" : "text-muted"}
        >
          {nameError ??
            (renameState.status === "saved" && !renaming ? "Name saved." : `/collections/${slug}`)}
        </p>
      </form>

      <form action={deleteAction} aria-busy={deleting} className="flex flex-col gap-2 md:items-end md:pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={`/admin/products?category=${id}`} className="link">
            {productCount} {productCount === 1 ? "product" : "products"}
          </Link>
          <ConfirmButton
            key={deleteState.error ?? "idle"}
            label="Delete"
            confirmLabel={`Delete ${name}`}
            pendingLabel="Deleting…"
            pending={deleting}
            disabled={inUse}
          />
        </div>
        {(deleteState.error || inUse) && (
          <p
            role={deleteState.error ? "alert" : undefined}
            className={deleteState.error ? "text-error md:text-right" : "text-muted md:text-right"}
          >
            {deleteState.error ?? "Only empty categories can be deleted."}
          </p>
        )}
      </form>
    </li>
  );
}
