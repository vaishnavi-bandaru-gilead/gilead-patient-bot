import React, { useState } from "react";

type AdaptiveElement =
    | { type: "TextBlock"; text: string; wrap?: boolean; weight?: "Bolder" | "Lighter" | "Default"; size?: string; }
    | { type: "Input.Text"; id: string; label?: string; placeholder?: string; isRequired?: boolean; errorMessage?: string; style?: string; regex?: string; isMultiline?: boolean; }
    | { type: "Input.ChoiceSet"; id: string; label?: string; isRequired?: boolean; errorMessage?: string; choices: { title: string; value: string }[]; placeholder?: string; }
    | { type: "ActionSet"; actions: any[]; };

interface AdaptiveCardContent {
    type: "AdaptiveCard";
    body: AdaptiveElement[];
    actions?: { type: "Action.Submit"; title: string; data?: any }[];
    version?: string;
}

interface Props {
    card: AdaptiveCardContent;
    onSubmit?: (values: any) => void;
}

const AdaptiveFormCard: React.FC<Props> = ({ card, onSubmit }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleChange = (id: string, value: string) => {
        setValues((prev) => ({ ...prev, [id]: value }));
        setErrors((prev) => ({ ...prev, [id]: "" }));
    };

    const handleSubmit = (actionData?: any) => {
        const newErrors: Record<string, string> = {};
        card.body.forEach((el) => {
            if (el.type === "Input.Text" || el.type === "Input.ChoiceSet") {
                const v = values[(el as any).id]?.trim() ?? "";
                if ((el as any).isRequired && !v) {
                    newErrors[(el as any).id] = (el as any).errorMessage || "Required";
                }
            }
        });

        if (Object.keys(newErrors).length === 0) {
            setSubmitted(true);
            onSubmit?.(actionData || values);
        } else {
            setErrors(newErrors);
        }
    };

    if (submitted) return <div style={{ fontStyle: "italic", textAlign: "center", padding: "10px", opacity: 0.8 }}>✓ Form submitted</div>;

    return (
        <div className="adaptive-form-wrapper" style={{
            width: "100%",
            minWidth: "350px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxSizing: "border-box" // Prevents overflow
        }}>
            {card.body.map((el, idx) => {
                if (el.type === "TextBlock") return null; // Handled as separate bubbles in ChatWindow

                const error = (el as any).id ? errors[(el as any).id] : null;

                if (el.type === "Input.Text") {
                    return (
                        <div key={(el as any).id} className="afc-field" style={{ width: "100%", boxSizing: "border-box" }}>
                            {el.label && (
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85em", fontWeight: 600 }}>
                                    {el.label}{el.isRequired && <span style={{ color: "red" }}> *</span>}
                                </label>
                            )}
                            {el.isMultiline ? (
                                <textarea
                                    placeholder={el.placeholder}
                                    value={values[el.id] || ""}
                                    onChange={(e) => handleChange(el.id, e.target.value)}
                                    style={{
                                        width: "100%", padding: "10px", borderRadius: "6px",
                                        border: error ? "1px solid red" : "1px solid #ccc",
                                        fontFamily: "inherit", resize: "vertical", boxSizing: "border-box"
                                    }}
                                    rows={3}
                                />
                            ) : (
                                <input
                                    placeholder={el.placeholder}
                                    value={values[el.id] || ""}
                                    onChange={(e) => handleChange(el.id, e.target.value)}
                                    type={el.style?.toLowerCase() === "email" ? "email" : "text"}
                                    style={{
                                        width: "100%", padding: "10px", borderRadius: "6px",
                                        border: error ? "1px solid red" : "1px solid #ccc",
                                        fontFamily: "inherit", boxSizing: "border-box"
                                    }}
                                />
                            )}
                            {error && <div style={{ color: "red", fontSize: "0.8em", marginTop: "2px" }}>{error}</div>}
                        </div>
                    );
                }

                if (el.type === "Input.ChoiceSet") {
                    return (
                        <div key={(el as any).id} className="afc-field" style={{ width: "100%", boxSizing: "border-box" }}>
                            {el.label && (
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85em", fontWeight: 600 }}>
                                    {el.label}{el.isRequired && <span style={{ color: "red" }}> *</span>}
                                </label>
                            )}
                            <select
                                onChange={(e) => handleChange((el as any).id, e.target.value)}
                                style={{ width: "100%", padding: "10px", borderRadius: "6px", boxSizing: "border-box", border: error ? "1px solid red" : "1px solid #ccc" }}
                            >
                                <option value="">{el.placeholder || "Select..."}</option>
                                {el.choices.map(c => <option key={c.value} value={c.value}>{c.title}</option>)}
                            </select>
                            {error && <div style={{ color: "red", fontSize: "0.8em", marginTop: "2px" }}>{error}</div>}
                        </div>
                    );
                }

                if (el.type === "ActionSet") {
                    return (
                        <div key={idx} style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "5px" }}>
                            {el.actions.map((act: any, i: number) => (
                                <button key={i} onClick={() => act.type === "Action.OpenUrl" ? window.open(act.url) : handleSubmit(act.data)}
                                        style={{ padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "0.9em", border: "1px solid #00539B", backgroundColor: "white", color: "#00539B" }}>
                                    {act.title}
                                </button>
                            ))}
                        </div>
                    );
                }
                return null;
            })}

            {card.actions?.some((a) => a.type === "Action.Submit") && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "5px" }}>
                    <button
                        onClick={() => handleSubmit(card.actions?.find(a => a.type === "Action.Submit")?.data)}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{
                            transition: "background-color 0.2s ease",
                            backgroundColor: isHovered ? "#c5203f" : "white",
                            color: isHovered ? "white" : "black",
                            border: "1px solid black",
                            borderColor: isHovered ? "#c5203f" : "black",
                            borderRadius: "20px", padding: "8px 24px", cursor: "pointer", fontWeight: "400", boxSizing: "border-box"
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