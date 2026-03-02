import React, { useState } from "react";
import { useAppContext } from "../AppContext";
import { Rule, RuleCondition, RuleAction, Project } from "../types";
import {
  ENTITY_REGISTRY,
  getActionOptions,
  getDefaultAction,
  getActionDisplayText,
  getConditionFields,
  isTextCondition,
  getRequiredConditions,
  TEXT_OPERATORS,
  NUMERIC_OPERATORS,
  ActionOption,
} from "../lib/entityRegistry";
import { Plus, Trash2, Edit2, Save, X, Folder, Settings } from "lucide-react";

export const RuleEngine: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject } = useAppContext();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(projects[0]?.id || null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [draftRule, setDraftRule] = useState<Rule | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProject: Project = {
      id: Math.random().toString(),
      name: newProjectName,
      description: "",
      rules: []
    };
    addProject(newProject);
    setActiveProjectId(newProject.id);
    setNewProjectName("");
    setIsCreatingProject(false);
  };

  const handleAddRule = () => {
    if (!activeProject) return;
    const newRule: Rule = {
      id: Math.random().toString(),
      name: "New Rule",
      entityType: "Keyword",
      isActive: true,
      conditions: [
        { id: Math.random().toString(), metric: "Clicks", operator: ">=", value: 10 },
      ],
      action: getDefaultAction("Keyword"),
    };
    updateProject(activeProject.id, {
      ...activeProject,
      rules: [...activeProject.rules, newRule]
    });
    handleEditRule(newRule);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setDraftRule({ ...rule, conditions: rule.conditions.map(c => ({ ...c })) });
  };

  const handleSaveRule = () => {
    if (draftRule && activeProject) {
      updateProject(activeProject.id, {
        ...activeProject,
        rules: activeProject.rules.map(r => r.id === draftRule.id ? draftRule : r)
      });
      setEditingRuleId(null);
      setDraftRule(null);
    }
  };

  const handleCancelRule = () => { setEditingRuleId(null); setDraftRule(null); };

  const handleDeleteRule = (ruleId: string) => {
    if (activeProject) {
      updateProject(activeProject.id, {
        ...activeProject,
        rules: activeProject.rules.filter(r => r.id !== ruleId)
      });
    }
  };

  const handleToggleRule = (rule: Rule) => {
    if (activeProject) {
      updateProject(activeProject.id, {
        ...activeProject,
        rules: activeProject.rules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r)
      });
    }
  };

  const handleAddCondition = () => {
    if (draftRule) {
      setDraftRule({
        ...draftRule,
        conditions: [
          ...draftRule.conditions,
          { id: Math.random().toString(), metric: "ACOS", operator: ">", value: 0 },
        ],
      });
    }
  };

  const handleRemoveCondition = (id: string) => {
    if (draftRule) {
      setDraftRule({
        ...draftRule,
        conditions: draftRule.conditions.filter((c) => c.id !== id),
      });
    }
  };

  const handleConditionChange = (id: string, field: keyof RuleCondition, value: any) => {
    if (!draftRule) return;
    setDraftRule({
      ...draftRule,
      conditions: draftRule.conditions.map((c) => {
        if (c.id !== id) return c;

        // When metric changes, auto-switch operator type
        if (field === "metric") {
          const textField = isTextCondition(value, draftRule.entityType);
          if (textField) {
            // Switching to text condition
            return { ...c, metric: value, operator: "equals" as any, value: 0, textValue: textField.options?.[0] || "" };
          } else {
            // Switching to numeric condition
            return { ...c, metric: value, operator: ">" as any, value: 0, textValue: undefined };
          }
        }
        return { ...c, [field]: value };
      }),
    });
  };

  const handleEntityTypeChange = (entityType: string) => {
    if (!draftRule) return;

    // Keep existing numeric conditions, replace entity-specific conditions
    const oldEntityFields = getConditionFields(draftRule.entityType).map(f => f.key);
    const keptConditions = draftRule.conditions.filter(c => !oldEntityFields.includes(c.metric));

    // Auto-add required conditions for new entity
    const requiredConds = getRequiredConditions(entityType).map(rc => ({
      id: Math.random().toString(),
      metric: rc.metric,
      operator: rc.operator as any,
      value: 0,
      textValue: rc.textValue,
    }));

    setDraftRule({
      ...draftRule,
      entityType,
      action: getDefaultAction(entityType),
      conditions: [...requiredConds, ...keptConditions],
    });
  };

  const handleActionChange = (option: ActionOption) => {
    if (draftRule) {
      const newAction: RuleAction = {
        type: option.type,
        targetField: option.targetField,
        ...(option.needsValue ? { value: draftRule.action.value || 10, unit: draftRule.action.unit || "%" } : {}),
      };
      setDraftRule({ ...draftRule, action: newAction });
    }
  };

  const getEntityIcon = (entityType: string) =>
    ENTITY_REGISTRY.find(e => e.type === entityType)?.icon || "📋";

  const actionKey = (type: string, targetField: string) => `${type}|${targetField}`;

  // Render a single condition row in edit mode
  const renderConditionEditor = (cond: RuleCondition) => {
    if (!draftRule) return null;
    const textField = isTextCondition(cond.metric, draftRule.entityType);
    const isText = !!textField;
    const entityFilterFields = getConditionFields(draftRule.entityType);

    return (
      <div key={cond.id} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex-wrap">
        {/* Metric selector */}
        <select
          value={cond.metric}
          onChange={(e) => handleConditionChange(cond.id, "metric", e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-w-[140px]"
        >
          <optgroup label="📊 Traffic">
            <option value="Impressions">Impressions</option>
            <option value="Clicks">Clicks</option>
            <option value="Click-through Rate">CTR (%)</option>
          </optgroup>
          <optgroup label="💰 Cost">
            <option value="Spend">Spend ($)</option>
            <option value="CPC">CPC ($)</option>
            <option value="ACOS">ACOS (%)</option>
          </optgroup>
          <optgroup label="💵 Revenue">
            <option value="Sales">Sales ($)</option>
            <option value="Orders">Orders</option>
            <option value="Units">Units</option>
            <option value="ROAS">ROAS</option>
          </optgroup>
          <optgroup label="📈 Conversion">
            <option value="Conversion Rate">CVR (%)</option>
          </optgroup>
          <optgroup label="📅 7-Day">
            <option value="7d Clicks">7d Clicks</option>
            <option value="7d Orders">7d Orders</option>
            <option value="7d Spend">7d Spend ($)</option>
            <option value="7d Sales">7d Sales ($)</option>
          </optgroup>
          <optgroup label="📅 30-Day">
            <option value="30d Orders">30d Orders</option>
            <option value="30d Spend">30d Spend ($)</option>
            <option value="30d Sales">30d Sales ($)</option>
          </optgroup>
          {entityFilterFields.length > 0 && (
            <optgroup label="🔍 Entity Filters">
              {entityFilterFields.map(f => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Operator selector — different for text vs numeric */}
        <select
          value={cond.operator}
          onChange={(e) => handleConditionChange(cond.id, "operator", e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        >
          {isText ? (
            TEXT_OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))
          ) : (
            NUMERIC_OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))
          )}
        </select>

        {/* Value input — select dropdown for select fields, text input for text, number for numeric */}
        {isText ? (
          textField.type === "select" && textField.options ? (
            <select
              value={cond.textValue || ""}
              onChange={(e) => handleConditionChange(cond.id, "textValue" as any, e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none flex-1 min-w-[140px]"
            >
              {textField.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={cond.textValue || ""}
              onChange={(e) => handleConditionChange(cond.id, "textValue" as any, e.target.value)}
              placeholder="Nhập giá trị..."
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none flex-1 min-w-[120px]"
            />
          )
        ) : (
          <input
            type="number"
            value={cond.value}
            onChange={(e) => handleConditionChange(cond.id, "value", parseFloat(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 w-24 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        )}

        <button
          onClick={() => handleRemoveCondition(cond.id)}
          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // Render condition in view mode
  const renderConditionBadge = (cond: RuleCondition) => {
    const isText = ["equals", "not_equals", "contains", "not_contains"].includes(cond.operator);
    const opLabels: Record<string, string> = { equals: "=", not_equals: "≠", contains: "∋", not_contains: "∌" };
    const displayOp = isText ? (opLabels[cond.operator] || cond.operator) : cond.operator;
    const displayValue = isText ? `"${cond.textValue || ""}"` : cond.value;

    return (
      <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">
        {cond.metric} {displayOp} {displayValue}
      </span>
    );
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar for Projects */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-emerald-500" />
            Projects
          </h2>
          <button
            onClick={() => setIsCreatingProject(true)}
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isCreatingProject && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Project Name"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
              <button onClick={handleCreateProject} className="text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-md">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => setIsCreatingProject(false)} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => setActiveProjectId(project.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${activeProjectId === project.id
                ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-semibold ${activeProjectId === project.id ? 'text-emerald-900' : 'text-slate-700'}`}>
                  {project.name}
                </h3>
                {activeProjectId === project.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Settings className="w-3 h-3" />
                {project.rules.length} rules configured
              </p>
            </div>
          ))}

          {projects.length === 0 && !isCreatingProject && (
            <div className="text-center p-6 text-slate-500 text-sm">
              No projects yet. Create one to get started.
            </div>
          )}
        </div>
      </div>

      {/* Main Content for Rules */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeProject ? (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                  {activeProject.name}
                </h1>
                <p className="text-slate-500">Manage rules for this project</p>
              </div>
              <button
                onClick={handleAddRule}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>

            <div className="grid gap-6">
              {activeProject.rules.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No rules configured</h3>
                  <p className="text-slate-500 mb-4">Add your first rule to start automating your campaigns.</p>
                  <button onClick={handleAddRule} className="text-emerald-600 font-medium hover:underline">
                    Create a rule
                  </button>
                </div>
              ) : (
                activeProject.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md"
                  >
                    {editingRuleId === rule.id && draftRule ? (
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <input
                            type="text"
                            value={draftRule.name}
                            onChange={(e) => setDraftRule({ ...draftRule, name: e.target.value })}
                            className="text-xl font-bold text-slate-900 bg-transparent border-b-2 border-emerald-500 focus:outline-none focus:border-emerald-600 px-1 py-0.5 w-full max-w-md"
                          />
                          <div className="flex gap-2">
                            <button onClick={handleSaveRule} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <Save className="w-5 h-5" />
                            </button>
                            <button onClick={handleCancelRule} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Entity Type Selector */}
                        <div>
                          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Target Entity
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {ENTITY_REGISTRY.map(entity => (
                              <button
                                key={entity.type}
                                onClick={() => handleEntityTypeChange(entity.type)}
                                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${draftRule.entityType === entity.type
                                  ? "bg-blue-50 border-blue-300 text-blue-800 shadow-sm"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                title={entity.description}
                              >
                                <span className="mr-1.5">{entity.icon}</span>
                                {entity.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Conditions */}
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                              Conditions (IF)
                            </h3>
                            {draftRule.conditions.map(renderConditionEditor)}
                            <button
                              onClick={handleAddCondition}
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" /> Add Condition
                            </button>
                          </div>

                          {/* Action */}
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                              Action (THEN)
                            </h3>
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">
                              <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Hành động</label>
                                <select
                                  value={actionKey(draftRule.action.type, draftRule.action.targetField)}
                                  onChange={(e) => {
                                    const options = getActionOptions(draftRule.entityType);
                                    const selected = options.find(o => actionKey(o.type, o.targetField) === e.target.value);
                                    if (selected) handleActionChange(selected);
                                  }}
                                  className="bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-full"
                                >
                                  {getActionOptions(draftRule.entityType).map(option => (
                                    <option key={actionKey(option.type, option.targetField)} value={actionKey(option.type, option.targetField)}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {["increase", "decrease", "set"].includes(draftRule.action.type) && (
                                <div>
                                  <label className="text-xs font-medium text-slate-500 mb-1 block">Giá trị</label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="number"
                                      value={draftRule.action.value || 0}
                                      onChange={(e) =>
                                        setDraftRule({
                                          ...draftRule,
                                          action: { ...draftRule.action, value: parseFloat(e.target.value) },
                                        })
                                      }
                                      className="bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                    {draftRule.action.targetField !== "Percentage" ? (
                                      <select
                                        value={draftRule.action.unit || "%"}
                                        onChange={(e) =>
                                          setDraftRule({
                                            ...draftRule,
                                            action: { ...draftRule.action, unit: e.target.value as "%" | "$" },
                                          })
                                        }
                                        className="bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                      >
                                        <option value="%">%</option>
                                        <option value="$">$</option>
                                      </select>
                                    ) : (
                                      <span className="text-sm font-medium text-emerald-700 px-2">pts</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Preview */}
                              <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                                <span className="text-xs text-slate-500">Preview: </span>
                                <span className="text-sm font-semibold text-emerald-800">
                                  {getActionDisplayText(draftRule.action)}
                                </span>
                                <span className="text-xs text-slate-400 ml-2">
                                  → trên {draftRule.entityType}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-slate-900">{rule.name}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${rule.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                              {rule.isActive ? "Active" : "Inactive"}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getEntityIcon(rule.entityType)} {rule.entityType}
                            </span>
                          </div>

                          <div className="flex items-center flex-wrap gap-2 text-sm text-slate-600 mt-4">
                            <span className="font-semibold text-slate-500">IF</span>
                            {rule.conditions.map((c, i) => (
                              <React.Fragment key={c.id}>
                                {renderConditionBadge(c)}
                                {i < rule.conditions.length - 1 && (
                                  <span className="text-slate-400 text-xs font-bold">AND</span>
                                )}
                              </React.Fragment>
                            ))}
                            <span className="font-semibold text-slate-500 ml-2">THEN</span>
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-mono text-xs border border-emerald-100 font-medium">
                              {getActionDisplayText(rule.action)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => handleToggleRule(rule)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <span className="text-xs font-medium">{rule.isActive ? "Disable" : "Enable"}</span>
                          </button>
                          <button onClick={() => handleEditRule(rule)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Folder className="w-16 h-16 text-slate-200 mb-4" />
            <h2 className="text-xl font-medium text-slate-600 mb-2">Select a Project</h2>
            <p>Choose a project from the sidebar or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};
