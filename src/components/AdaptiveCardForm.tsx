import React, { useState } from "react";

type AdaptiveElement =
    | {
    type: "TextBlock";
    text: string;
    wrap?: boolean;
    weight?: "Bolder" | "Lighter" | "Default";
    size?: string;
}
    | {
    type: "Input.Text";
    id: string;
    label?: string;
    placeholder?: string;
    isRequired?: boolean;
    errorMessage?: string;
    style?: string;
    regex?: string;
    isMultiline?: boolean;
};

interface AdaptiveCardContent {
    type: "AdaptiveCard";
    body: AdaptiveElement[];
    actions?: { type: "Action.Submit"; title: string }[];
    version?: string;
    $schema?: string;
}

interface Props {
    card: AdaptiveCardContent;
    onSubmit?: (values: Record<string, string>) => void;
}

const AdaptiveFormCard: React.FC<Props> = ({ card, onSubmit }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);

    // State to handle button hover effect
    const [isHovered, setIsHovered] = useState(false);

    const handleChange = (id: string, value: string) => {
        setValues((prev) => ({ ...prev, [id]: value }));
        setErrors((prev) => ({ ...prev, [id]: "" }));
    };

    const handleSubmit = () => {
        const newErrors: Record<string, string> = {};

        card.body.forEach((el) => {
            if (el.type === "Input.Text") {
                const v = values[el.id]?.trim() ?? "";
                if (el.isRequired && !v) {
                    newErrors[el.id] = el.errorMessage || "This field is required";
                }
                if (v && el.regex) {
                    try {
                        const re = new RegExp(el.regex);
                        if (!re.test(v)) {
                            newErrors[el.id] = el.errorMessage || "Invalid value";
                        }
                    } catch { /* ignore regex errors */ }
                }
            }
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            setSubmitted(true);
            onSubmit?.(values);
        }
    };

    if (submitted) {
        return (
            <div style={{ fontStyle: "italic", textAlign: "center", padding: "10px", opacity: 0.8 }}>
                ✓ Form submitted
            </div>
        );
    }

    return (
        <div className="adaptive-form-wrapper" style={{
            width: "100%",
            minWidth: "350px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxSizing: "border-box"
        }}>
            {card.body.map((el) => {
                if (el.type === "TextBlock") return null;

                if (el.type === "Input.Text") {
                    const value = values[el.id] ?? "";
                    const error = errors[el.id];

                    return (
                        <div key={el.id} className="afc-field" style={{ width: "100%" }}>
                            {el.label && (
                                <label
                                    htmlFor={el.id}
                                    style={{ display: "block", marginBottom: "4px", fontSize: "0.85em", fontWeight: 600 }}
                                >
                                    {el.label}
                                    {el.isRequired && <span style={{ color: "red" }}> *</span>}
                                </label>
                            )}

                            {el.isMultiline ? (
                                <textarea
                                    id={el.id}
                                    placeholder={el.placeholder}
                                    value={value}
                                    onChange={(e) => handleChange(el.id, e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        border: error ? "1px solid red" : "1px solid #ccc",
                                        fontFamily: "inherit",
                                        resize: "vertical",
                                        boxSizing: "border-box"
                                    }}
                                    rows={3}
                                />
                            ) : (
                                <input
                                    id={el.id}
                                    placeholder={el.placeholder}
                                    value={value}
                                    onChange={(e) => handleChange(el.id, e.target.value)}
                                    type={el.style?.toLowerCase() === "email" ? "email" : "text"}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        border: error ? "1px solid red" : "1px solid #ccc",
                                        fontFamily: "inherit",
                                        boxSizing: "border-box"
                                    }}
                                />
                            )}
                            {error && <div style={{ color: "red", fontSize: "0.8em", marginTop: "2px" }}>{error}</div>}
                        </div>
                    );
                }
                return null;
            })}

            {/* Submit Button Area - Aligned Right */}
            {card.actions?.some((a) => a.type === "Action.Submit") && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "5px" }}>
                    <button
                        onClick={handleSubmit}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{
                            // Transition for smooth color change
                            transition: "background-color 0.2s ease",
                            // Dynamic Background: Blue default, Red on hover
                            backgroundColor: isHovered ? "#c5203f" : "",
                            color: isHovered ? "white" : "black",
                            border: "1px solid black",
                            borderColor: isHovered ? "#c5203f" : "black",
                            // Rounded Pill Shape
                            borderRadius: "20px",
                            // Padding for width/height balance
                            padding: "8px 24px",
                            fontFamily: "inherit",
                            fontSize: "0.95em",
                            cursor: "pointer",
                            fontWeight: "400",
                            boxSizing: "border-box"
                        }}
                    >
                        {card.actions.find((a) => a.type === "Action.Submit")?.title ?? "Submit"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdaptiveFormCard;