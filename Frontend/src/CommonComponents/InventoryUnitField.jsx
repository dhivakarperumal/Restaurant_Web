const unitOptions = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "mg", label: "Milligram (mg)" },
  { value: "l", label: "Liter (L)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "packet", label: "Packet" },
  { value: "bottle", label: "Bottle" },
  { value: "box", label: "Box" },
  { value: "dozen", label: "Dozen" },
  { value: "Other", label: "Other" },
];
const unitValues = new Set(unitOptions.map((option) => option.value));

const InventoryUnitField = ({ value, onChange, className }) => {
  const isCustomUnit = value && !unitValues.has(value);
  const selectedUnit = isCustomUnit ? "Other" : value || "pcs";

  return (
    <div className="space-y-2">
      <select
        className={className}
        value={selectedUnit}
        onChange={(event) => onChange(event.target.value)}
      >
        {unitOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {selectedUnit === "Other" && (
        <input
          className={className}
          value={isCustomUnit ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter unit"
          aria-label="Custom unit"
          required
        />
      )}
    </div>
  );
};

export default InventoryUnitField;
