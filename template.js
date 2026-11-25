// https://raw.githubusercontent.com/inkzer0/sing-box-sub-store-template/main/template.js#url=代理订阅链接
// 省略 outbound 时，订阅节点会加入模板中每个 selector 和 urltest 组。
// 兼容原版的按组筛选参数，例如 #name=机场&outbound=🕳^hk$🏷ℹ️香港|hk

// 🕳 后匹配组名，🏷 后匹配节点名，ℹ️ 表示忽略大小写。组合订阅使用 type=组合订阅。
// 可选参数: includeUnsupportedProxy 含不支持的协议 SSR 和 Snell. 用法: `&includeUnsupportedProxy=true`

// 支持传入订阅 URL. 参数为 url. 记得 url 在 URL query 参数中使用需要 encodeURIComponent. 直接使用前端的可视化参数编辑不需要 encodeURIComponent.
// 例如: http://a.com?token=123 应使用 url=http%3A%2F%2Fa.com%3Ftoken%3D123

// ⚠️ 如果 outbounds 为空, 自动创建 COMPATIBLE(direct) 并插入 防止报错
log(`🚀 开始`)

let { type, name, outbound, includeUnsupportedProxy, url } = $arguments

log(`传入参数 type: ${type}, name: ${name}, outbound: ${outbound}`)

type = /^1$|col|组合/i.test(type) ? 'collection' : 'subscription'

const parser = ProxyUtils.JSON5 || JSON
log(`① 使用 ${ProxyUtils.JSON5 ? 'JSON5' : 'JSON'} 解析配置文件`)
let config
try {
  config = parser.parse($content ?? $files[0])
} catch (e) {
  log(`${e.message ?? e}`)
  throw new Error(`配置文件不是合法的 ${ProxyUtils.JSON5 ? 'JSON5' : 'JSON'} 格式`)
}
log(`② 获取订阅`)

let proxies = []
let outbounds = []
let endpoints = []
let data = {}
if (url) {
  log(`读取远程订阅`)
  data = await produceArtifact({
    type: 'subscription',
    platform: 'sing-box',
    produceOpts: {
      'include-unsupported-proxy': includeUnsupportedProxy,
    },
    subscription: {
      name: name || 'remote-subscription',
      url,
      source: 'remote',
    },
  })
} else {
  log(`将读取名称为 ${name} 的 ${type === 'collection' ? '组合' : ''}订阅`)
  data = await produceArtifact({
    name,
    type,
    platform: 'sing-box',
    produceOpts: {
      'include-unsupported-proxy': includeUnsupportedProxy,
    },
  })
}
data = JSON.parse(data)
outbounds = data.outbounds ?? []
endpoints = data.endpoints ?? []
proxies = [...outbounds, ...endpoints]
log(`获取到 ${outbounds.length} 个节点, ${endpoints.length} 个端点`)

log(`③ outbound 规则解析`)
const rules = (outbound ?? '')
  .split('🕳')
  .map(rule => rule.trim())
  .filter(Boolean)
  .map(rule => {
    const [groupPattern, nodePattern = '.*'] = rule.split('🏷')
    return { group: createOutboundRegExp(groupPattern), node: createTagRegExp(nodePattern) }
  })

log(`④ outbound 插入节点`)
if (!Array.isArray(config.outbounds)) {
  config.outbounds = []
}
const allTags = proxies.map(proxy => proxy.tag)
let fallbackTag
for (const group of config.outbounds.slice()) {
  let tags = allTags
  if (rules.length) {
    const matches = rules.filter(rule => rule.group.test(group.tag))
    if (!matches.length) continue
    tags = []
    for (const rule of matches) {
      for (const tag of allTags) {
        if (rule.node.test(tag)) tags.push(tag)
      }
    }
  } else if (group.type !== 'selector' && group.type !== 'urltest') {
    continue
  }

  const members = new Set(group.outbounds ?? [])
  for (const tag of tags) members.add(tag)
  if (members.size === 0) {
    if (!fallbackTag) {
      const used = new Map([...config.outbounds, ...(config.endpoints ?? []), ...proxies].map(item => [item.tag, item.type]))
      fallbackTag = 'COMPATIBLE'
      while (used.has(fallbackTag) && used.get(fallbackTag) !== 'direct') fallbackTag += '-direct'
      if (!used.has(fallbackTag)) config.outbounds.push({ type: 'direct', tag: fallbackTag })
    }
    members.add(fallbackTag)
  }
  group.outbounds = [...members]
}

config.outbounds.push(...outbounds)
if (!Array.isArray(config.endpoints)) {
  config.endpoints = []
}
config.endpoints.push(...endpoints)

$content = JSON.stringify(config, null, 2)

function log(v) {
  console.log(`[📦 sing-box 模板脚本] ${v}`)
}
function createTagRegExp(tagPattern) {
  return new RegExp(tagPattern.replace('ℹ️', ''), tagPattern.includes('ℹ️') ? 'i' : undefined)
}
function createOutboundRegExp(outboundPattern) {
  return new RegExp(outboundPattern.replace('ℹ️', ''), outboundPattern.includes('ℹ️') ? 'i' : undefined)
}

log(`🔚 结束`)
