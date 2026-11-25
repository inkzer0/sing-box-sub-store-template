// Sub-Store → 文件 → 普通文件 → 脚本操作。输入为单份 sing-box 源规则集 JSON。
// 客户端共用文件下载链接。手动指定示例：?target=quanx&policy=direct
// 浏览器、即时预览和未标明客户端的下载器默认获得原始 JSON。
{
  const options = typeof $options === "undefined" ? {} : ($options || {});
  const request = options._req || {};
  const query = request.query || {};
  const headers = request.headers || {};
  const uaKey = Object.keys(headers).find(key => key.toLowerCase() === "user-agent");
  const ua = String(headers[uaKey] || "");

  function selectFormat(target) {
    if (target != null && target !== "") {
      switch (String(target).trim().toLowerCase()) {
        case "mihomo":
        case "clashmeta":
        case "clash.meta":
        case "surge":
        case "surgemac":
        case "surgeios":
          return "classical";
        case "quanx":
        case "qx":
        case "quantumult x":
        case "quantumult%20x":
        case "quantumultx":
        case "qtx":
          return "quanx";
        case "singbox":
        case "sing-box":
          return "singbox";
        default:
          throw new Error("target 可选 mihomo、surge、quanx 或 singbox。");
      }
    }
    if (/quantumult(?:%20|[ _-])*x|\bquanx\b/i.test(ua)) return "quanx";
    if (/sing[ -]?box/i.test(ua)) return "singbox";
    if (/mihomo|clash|surge/i.test(ua)) return "classical";
    return "singbox";
  }

  function renderLines(source, format) {
    const quanx = format === "quanx";
    const policy = query.policy ?? "direct";
    if (quanx && (typeof policy !== "string" || !policy.trim() || /[,\r\n\0]/.test(policy))) {
      throw new Error("QuanX 策略名须为非空文本，且不能含逗号或换行。");
    }
    const names = new Map([
      ["domain", quanx ? "host" : "DOMAIN"],
      ["domain_suffix", quanx ? "host-suffix" : "DOMAIN-SUFFIX"],
      ["domain_keyword", quanx ? "host-keyword" : "DOMAIN-KEYWORD"],
      ["ip_cidr", quanx ? "ip-cidr" : "IP-CIDR"]
    ]);
    const lines = [];
    for (const [index, rule] of source.rules.entries()) {
      const where = "rules[" + index + "]";
      if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
        throw new Error(where + " 应为规则对象。");
      }
      const start = lines.length;
      for (const [field, entries] of Object.entries(rule)) {
        if ((field === "type" && rule.type === "default") ||
            (field === "invert" && rule.invert === false)) continue;
        if (!names.has(field)) {
          throw new Error(where + "." + field + " 无法转换为此文本规则集。");
        }
        for (const value of Array.isArray(entries) ? entries : [entries]) {
          if (typeof value !== "string" || !value || value !== value.trim() || /[,\r\n\0]/.test(value)) {
            throw new Error(where + "." + field + " 含有无法写入文本规则的值。");
          }
          if (field === "domain_suffix" && (source.version === 1 || value.startsWith("."))) {
            throw new Error(where + " 的域名后缀匹配范围与目标格式不同：" + value);
          }
          let type = names.get(field);
          let match = value;
          if (field === "ip_cidr") {
            const ipv6 = value.includes(":");
            if (ipv6) type = quanx ? "ip6-cidr" : "IP-CIDR6";
            if (!value.includes("/")) match += ipv6 ? "/128" : "/32";
          }
          lines.push(type + "," + match + (quanx ? "," + policy.trim() : ""));
        }
      }
      if (lines.length === start) throw new Error(where + " 缺少可转换的匹配条件。");
    }
    return lines.length ? lines.join("\n") + "\n" : "";
  }

  const input = $content ?? (typeof $files === "undefined" ? undefined : $files[0]);
  if (typeof input !== "string" || !input.trim()) throw new Error("请将 sing-box 源规则集 JSON 设为文件内容。");
  const source = JSON.parse(input.replace(/^\uFEFF/, ""));
  if (!source || !Number.isInteger(source.version) || !Array.isArray(source.rules)) {
    throw new Error("需要包含 version 和 rules 数组的 sing-box 源规则集。");
  }
  const format = selectFormat(query.target);
  $content = format === "singbox" ? input : renderLines(source, format);

  // 同一个 URL 会按请求客户端返回不同内容，供 HTTP 缓存区分。
  if (options._req) {
    const response = options._res || (options._res = {});
    const outHeaders = response.headers || (response.headers = {});
    const varyKey = Object.keys(outHeaders).find(key => key.toLowerCase() === "vary") || "Vary";
    const vary = String(outHeaders[varyKey] || "").split(",").map(value => value.trim()).filter(Boolean);
    if (!vary.some(value => value === "*" || value.toLowerCase() === "user-agent")) vary.push("User-Agent");
    outHeaders[varyKey] = vary.join(", ");
    outHeaders["Content-Type"] = (format === "singbox" ? "application/json" : "text/plain") + "; charset=utf-8";
  }
}
