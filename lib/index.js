/**
 * dsh-mold — 模具选型与成本估算
 */

export const name = "dsh-mold";
export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";
const TEXT_OUTPUT = {
  schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

function n(v, d) { const x = Number(v); return Number.isFinite(x) ? x : d; }

const TOOLS = {
  mold_select: {
    description: "模具选型：按产品材料、年产量、精度推荐模具类型、腔数与模架钢",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        material: { type: "string", enum: ["plastic", "aluminum", "zinc", "steel"], description: "产品材料类别" },
        annual_qty: { type: "number", description: "年产量（件）" },
        tolerance: { type: "string", enum: ["general", "precision", "high"], description: "精度等级" },
      },
      required: ["material", "annual_qty"],
    },
    run(args) {
      const mat = String(args.material || "plastic");
      const qty = n(args.annual_qty, 0);
      const tol = String(args.tolerance || "general");
      if (qty <= 0) throw new Error("年产量必须大于 0");
      const lines = ["模具选型", "=".repeat(52), "材料: " + mat, "年产量: " + qty + " 件", "精度: " + tol, ""];
      let type, steel, cavities;
      if (mat === "plastic") {
        if (qty < 5000) { type = "简易模/手板模（铝模）"; steel = "铝合金 7075"; cavities = 1; }
        else if (qty < 100000) { type = "两板模（标准模架）"; steel = "P20 / 718H"; cavities = Math.max(1, Math.min(8, Math.round(qty / 30000))); }
        else { type = "热流道多腔模"; steel = "S136 / H13（淬火）"; cavities = Math.max(4, Math.min(32, Math.round(qty / 200000))); }
        if (tol === "high") { type += " + 高精度导向"; steel = "S136 淬火"; }
      } else if (mat === "aluminum" || mat === "zinc") {
        type = "压铸模"; steel = "H13 / SKD61"; cavities = qty > 200000 ? 4 : 2;
        if (tol === "high") type += "（高精度型腔）";
      } else {
        type = "冲压模/级进模"; steel = "Cr12MoV / DC53"; cavities = qty > 500000 ? 1 : 1;
      }
      lines.push("推荐模具: " + type);
      lines.push("模架/型腔钢: " + steel);
      lines.push("建议腔数: " + cavities);
      lines.push("");
      lines.push("模具寿命参考: 铝模 1–5 万模次；P20 30–50 万；S136/H13 50–100 万；硬质合金更高。");
      lines.push("选型需结合产品结构、浇口位置与工厂能力，本工具只给方向。");
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
  mold_cost: {
    description: "模具成本粗估：按尺寸等级、腔数、精度给出价格区间与周期",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        size: { type: "string", enum: ["small", "medium", "large"], description: "模具尺寸等级" },
        cavities: { type: "number", description: "腔数" },
        precision: { type: "string", enum: ["general", "precision", "high"], description: "精度" },
      },
      required: ["size", "cavities"],
    },
    run(args) {
      const size = String(args.size || "medium");
      const cav = Math.max(1, n(args.cavities, 1));
      const prec = String(args.precision || "general");
      const base = { small: 15000, medium: 45000, large: 120000 }[size] || 45000;
      const cavFactor = 1 + (cav - 1) * 0.45;
      const precFactor = { general: 1, precision: 1.35, high: 1.8 }[prec] || 1;
      const low = Math.round(base * cavFactor * precFactor * 0.8 / 1000) * 1000;
      const high = Math.round(base * cavFactor * precFactor * 1.3 / 1000) * 1000;
      const weeks = size === "small" ? "3–5 周" : size === "medium" ? "5–8 周" : "8–12 周";
      return ["模具成本粗估", "=".repeat(52), "尺寸: " + size + "，腔数: " + cav + "，精度: " + prec,
        "价格区间: " + low.toLocaleString() + " ~ " + high.toLocaleString() + " 元",
        "交期参考: " + weeks, "", "价格为行业粗略区间，受结构复杂度、钢材价格与地区影响，以报价为准。", "",
        "更多工具：" + SITE].join(NL);
    },
  },
};

export function apply(ctx, config) {
  void config;
  for (const name of Object.keys(TOOLS)) {
    const t = TOOLS[name];
    ctx.tools.register({
      name: name,
      description: t.description,
      parameters: t.parameters,
      output: TEXT_OUTPUT,
      async execute(args) { try { return { text: t.run(args || {}) }; } catch (e) { return { text: "处理失败: " + String((e && e.message) || e) }; } },
    });
  }
}
