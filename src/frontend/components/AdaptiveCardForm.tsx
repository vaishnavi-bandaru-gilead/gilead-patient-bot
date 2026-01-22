import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MagnifyingGlass, CaretDown } from "phosphor-react";

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
    onSubmit?: (payload: { data: any; title: string }) => void;
}

const AdaptiveFormCard: React.FC<Props> = ({ card, onSubmit }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isHovered, setIsHovered] = useState(false);

    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = (id: string) => {
        if (openDropdownId === id) {
            setOpenDropdownId(null);
        } else if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
            setOpenDropdownId(id);
            setSearchTerm("");
        }
    };

    const handleChange = (id: string, value: string) => {
        setValues((prev) => ({ ...prev, [id]: value }));
        setErrors((prev) => ({ ...prev, [id]: "" }));
        setOpenDropdownId(null);
    };

    const handleSubmit = (actionData?: any, actionTitle?: string) => {
        const newErrors: Record<string, string> = {};
        let displayTitle = actionTitle || "Submitted";

        card.body.forEach((el) => {
            if (el.type === "Input.Text" || el.type === "Input.ChoiceSet") {
                const fieldId = (el as any).id;
                const v = values[fieldId]?.trim() ?? "";

                if ((el as any).isRequired && !v) {
                    newErrors[fieldId] = (el as any).errorMessage || "Required";
                }

                if (el.type === "Input.ChoiceSet" && v) {
                    const choice = el.choices.find(c => c.value === v);
                    if (choice) {
                        displayTitle = choice.title;
                    }
                }
            }
        });

        if (Object.keys(newErrors).length === 0) {
            const finalData = { ...values, ...actionData };
            onSubmit?.({
                data: finalData,
                title: displayTitle
            });
        } else {
            setErrors(newErrors);
        }
    };

    return (
        <div className="adaptive-form-wrapper" style={{
            width: "100%",
            minWidth: "350px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxSizing: "border-box"
        }}>
            {card.body.map((el, idx) => {
                if (el.type === "TextBlock") return null;

                const error = (el as any).id ? errors[(el as any).id] : null;

                if (el.type === "Input.Text") {
                    return (
                        <div key={(el as any).id} style={{ width: "100%" }}>
                            {el.label && (
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85em", fontWeight: 600 }}>
                                    {el.label}{el.isRequired && <span style={{ color: "red" }}> *</span>}
                                </label>
                            )}
                            {el.isMultiline ? (
                                <textarea
                                    placeholder={el.placeholder}
                                    value={values[el.id] || ""}
                                    onChange={(e) => handleChange(el.id, e.target.value)}
                                    style={{
                                        width: "100%", padding: "12px", borderRadius: "8px",
                                        border: error ? "1.5px solid red" : "1px solid #ddd",
                                        fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none"
                                    }}
                                    rows={3}
                                />
                            ) : (
                                <input
                                    placeholder={el.placeholder}
                                    value={values[el.id] || ""}
                                    onChange={(e) => handleChange(el.id, e.target.value)}
                                    style={{
                                        width: "100%", padding: "12px", borderRadius: "8px",
                                        border: error ? "1.5px solid red" : "1px solid #ddd",
                                        fontFamily: "inherit", boxSizing: "border-box", outline: "none"
                                    }}
                                />
                            )}
                            {error && <div style={{ color: "red", fontSize: "0.8em", marginTop: "4px" }}>{error}</div>}
                        </div>
                    );
                }

                if (el.type === "Input.ChoiceSet") {
                    const isOpen = openDropdownId === (el as any).id;
                    const selectedChoice = (el as any).choices.find((c: any) => c.value === values[(el as any).id]);
                    const filteredChoices = (el as any).choices.filter((c: any) =>
                        c.title.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    return (
                        <div key={(el as any).id} style={{ width: "93%" }}>
                            {el.label && (
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85em", fontWeight: 600 }}>
                                    {el.label}{el.isRequired && <span style={{ color: "red" }}> *</span>}
                                </label>
                            )}

                            <div
                                ref={triggerRef}
                                onClick={() => toggleDropdown((el as any).id)}
                                style={{
                                    width: "96%", padding: "12px", borderRadius: "8px",
                                    border: error ? "1.5px solid red" : "1px solid #ddd",
                                    backgroundColor: "white", cursor: "pointer", display: "flex",
                                    justifyContent: "space-between", alignItems: "center"
                                }}
                            >
                                <span style={{ color: selectedChoice ? "#000" : "#999", fontSize: "0.95em" }}>
                                    {selectedChoice ? selectedChoice.title : (el.placeholder || "Select...")}
                                </span>
                                <CaretDown size={16} color="#666" weight="bold" />
                            </div>

                            {isOpen && createPortal(
                                <div
                                    ref={dropdownMenuRef}
                                    style={{
                                        position: "absolute",
                                        top: `${dropdownPos.top + 5}px`,
                                        left: `${dropdownPos.left}px`,
                                        width: `${dropdownPos.width}px`,
                                        backgroundColor: "white",
                                        zIndex: 10000,
                                        borderRadius: "5px",
                                        boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
                                        border: "1px solid #c6cac6",
                                        overflow: "hidden"
                                    }}
                                >
                                    <div style={{ padding: "12px", borderBottom: "1px solid #eee", backgroundColor: "#fff" }}>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: "10px",
                                            backgroundColor: "white", padding: "8px 12px",
                                            border: "1px solid #eee",
                                            borderRadius: "6px"
                                        }}>
                                            <MagnifyingGlass size={18} color="#999" />
                                            <input
                                                autoFocus
                                                placeholder="Search"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                style={{ border: "none", outline: "none", width: "100%", fontSize: "0.95em", backgroundColor: "transparent" }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                                        {filteredChoices.length > 0 ? filteredChoices.map((c: any) => (
                                            <div
                                                key={c.value}
                                                onClick={() => handleChange((el as any).id, c.value)}
                                                style={{
                                                    padding: "12px 16px", cursor: "pointer", fontSize: "0.95em",
                                                    backgroundColor: values[(el as any).id] === c.value ? "rgba(60,61,60,0.71)" : "transparent"
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f8f8")}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = values[(el as any).id] === c.value ? "#f0f0f0" : "transparent")}
                                            >
                                                {c.title}
                                            </div>
                                        )) : (
                                            <div style={{ padding: "15px", textAlign: "center", color: "#999", fontSize: "0.9em" }}>No results found</div>
                                        )}
                                    </div>
                                </div>,
                                document.body
                            )}
                            {error && <div style={{ color: "red", fontSize: "0.8em", marginTop: "4px" }}>{error}</div>}
                        </div>
                    );
                }

                if (el.type === "ActionSet") {
                    return (
                        <div className={"action-set-container"} key={idx} style={{ marginTop: "10px" }}>
                            {el.actions.map((act: any, i: number) => (
                                <button
                                    className={"suggested-action-btn"}
                                    key={i}
                                    onClick={() => act.type === "Action.OpenUrl" ? window.open(act.url) : handleSubmit(act.data, act.title)}
                                >
                                    {act.title}
                                </button>
                            ))}
                        </div>
                    );
                }
                return null;
            })}

            {card.actions?.some((a) => a.type === "Action.Submit") && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                    {card.actions.filter(a => a.type === "Action.Submit").map((action, i) => (
                        <button
                            key={i}
                            onClick={() => handleSubmit(action.data, action.title)}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            style={{
                                transition: "all 0.2s ease",
                                backgroundColor: isHovered ? "#c5203f" : "white",
                                color: isHovered ? "white" : "black",
                                border: "1px solid black",
                                borderColor: isHovered ? "#c5203f" : "black",
                                borderRadius: "20px", padding: "8px 24px", cursor: "pointer", fontWeight: "400", boxSizing: "border-box"
                            }}
                        >
                            {action.title ?? "Submit"}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdaptiveFormCard;