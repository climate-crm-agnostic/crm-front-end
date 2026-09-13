"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { Switch } from "./ui/switch";
import { SearchableSelect } from "./SearchableSelect";

export function Form({
  fields,
  initialValues,
  onSubmit,
  submitText = "Save",
  submitting = false,
  disabled: formDisabled = false,
  esAtributo = false,
}) {
  const [formData, setFormData] = useState(initialValues || {});

  const [useAttributes, setUseAttributes] = useState(false);
  const [valuesList, setValuesList] = useState([]);
  const [inputValue, setInputValue] = useState("");


  const { usuario } = useAuth();
  const empresaID = usuario?.empresa_id;

  console.log(empresaID);

  // Keep sync if initial values change (e.g. when editing another row)
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialValues || initialized) return;

    setFormData(initialValues);

    if (initialValues?.valores_pre_cargados?.valores) {
      setValuesList(initialValues.valores_pre_cargados.valores);
      setUseAttributes(true);
    }

    setInitialized(true);
  }, [initialValues, initialized]);

  const addValue = () => {
    if (!inputValue.trim()) return;

    setValuesList(prev => [...prev, inputValue.trim()]);
    setInputValue("");

    setFormData(prev => ({
      ...prev,
      valores_pre_cargados: { valores: [...valuesList, inputValue.trim()] }
    }));
  };

  const removeValue = (index) => {
    const newList = valuesList.filter((_, i) => i !== index);

    setValuesList(newList);

    setFormData(prev => ({
      ...prev,
      valores_pre_cargados: { valores: newList }
    }));
  };



  const calculateTotal = (data) => {
    const laborPrice = Number(data.precio_mano_obra) || 0;
    const partsPrice = Number(data.precio_repuestos) || 0;
    // Round to avoid floating point issues if necessary, otherwise use just the sum
    return (laborPrice + partsPrice).toFixed(2);
  };

  useEffect(() => {
    if (empresaID === 1) {
      const currentTotal = Number(formData.total) || 0;
      const newTotal = Number(calculateTotal(formData));

      if (
        formData.hasOwnProperty('precio_mano_obra') &&
        formData.hasOwnProperty('precio_repuestos') &&
        currentTotal !== newTotal
      ) {
        setFormData((prev) => ({
          ...prev,
          total: newTotal,
        }));
      }
    }
  }, [formData.precio_mano_obra, formData.precio_repuestos, empresaID]);

  const handleChange = (name, value, type) => {
    const normalized =
      type === "number" ? (value === "" ? "" : Number(value)) : value;
    setFormData((prev) => ({ ...prev, [name]: normalized }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fields.map((field) => {
        const {
          name,
          label,
          type = "text",
          placeholder,
          required = false,
          rows = 4,
          options,
          min,
          max,
          hint,
          disabled = false,              // <- per field
          readOnly = false,              // <- per field
        } = field;


        const isDisabled = formDisabled || disabled;
        const value = formData?.[name] ?? "";

        const isTotalField = name === 'total' && empresaID === 1;
        const finalDisabled = isDisabled || isTotalField;
        const finalReadOnly = readOnly || isTotalField;
        return (
          <div key={name} className="space-y-2">
            {label ? (
              <Label htmlFor={name} className="text-base text-codex-secondary dark:text-codex-texto-terciario-variante1">
                {label}
                {required ? <span className="text-destructive"> *</span> : null}
              </Label>
            ) : null}

            {/* Supported types */}
            {
              type === "color" ? (
                <div className="flex items-center gap-3">
                  <Input
                    id={name}
                    name={name}
                    type="color"
                    value={value || "#000000"}
                    disabled={finalDisabled}
                    readOnly={finalReadOnly}
                    onChange={(e) => handleChange(name, e.target.value, type)}
                    className="w-12 h-10 p-1 rounded cursor-pointer"
                  />

                  <Input
                    type="text"
                    value={value || ""}
                    onChange={(e) => handleChange(name, e.target.value, "text")}
                    className="flex-1 bg-card"
                    placeholder="#HEX"
                  />
                </div>
              ) :
                type === "textarea" ? (
                  <Textarea
                    id={name}
                    name={name}
                    rows={rows}
                    placeholder={placeholder || ""}
                    value={value}
                    required={required}
                    onChange={(e) => handleChange(name, e.target.value, type)}
                    className="bg-card"
                  />
                ) : type === "selector" ? (
                  <Select
                    value={String(value ?? "")}
                    onValueChange={(val) => handleChange(name, val, "text")}
                  >
                    <SelectTrigger id={name} className="bg-card/80 w-full h-11">
                      <SelectValue
                        placeholder={placeholder || "Select an option"}
                      />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      {(options || []).map((opt) => (
                        <SelectItem
                          key={String(opt.id ?? opt.value)}
                          value={String(opt.id ?? opt.value)}
                        >
                          {opt.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : type === "searchable-selector" ? (
                  <SearchableSelect
                    options={options}
                    value={value}
                    onChange={(val) => handleChange(name, val, "text")}
                    placeholder={placeholder}
                    disabled={finalDisabled || finalReadOnly}
                  />
                ) : (
                  <Input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder || ""}
                    value={String(value)}
                    disabled={finalDisabled}
                    readOnly={finalReadOnly}
                    onChange={(e) => {
                      if (finalDisabled || finalReadOnly) return;
                      handleChange(name, e.target.value, type);
                    }}
                    required={required}
                    min={min}
                    max={max}
                    className={`bg-card ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}

                  />
                )}

            {hint ? (
              <p className="text-sm text-muted-foreground">{hint}</p>
            ) : null}
          </div>
        );
      })}

      {
        esAtributo && (
          <div className="p-4 border border-codex-bordes-secondary-variante2 dark:border-codex-bordes-secondary-variante4 rounded-xl space-y-4">

            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-codex-secondary dark:text-codex-texto-terciario-variante1">
                Is selector?
              </Label>

              <Switch className="h-full w-8 accent-primary"
                checked={useAttributes}
                onCheckedChange={setUseAttributes}
              />
            </div>

            {useAttributes && (
              <div className="space-y-4">

                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="New value"
                    className="bg-card flex-1"
                  />

                  <Button
                    type="button"
                    variant={"terciary"}
                    onClick={addValue}
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {valuesList.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-codex-fondo-primary-variante1 dark:bg-codex-fondo-terciario-variante5 text-codex-cards-primary dark:text-codex-texto-terciario-variante1 px-3 py-1 rounded-full border border-primary/20 shadow-sm"
                    >
                      <span className="text-base">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeValue(index)}
                        className="ml-2 text-codex-cards-primary dark:text-codex-texto-terciario-variante1 hover:text-red-500 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {valuesList.length === 0 && (
                    <p className="text-base text-codex-cards-secondary-variante3 dark:text-codex-texto-terciario-variante2">
                      No values added.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      }



      <div className="flex justify-end gap-2">
        <Button variant={"terciary"} type="submit" disabled={submitting} className=" text-[#fff] ">
          {submitting ? "Saving..." : submitText}
        </Button>
      </div>
    </form >
  );
}
