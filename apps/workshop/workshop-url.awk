function reject(message) {
  print variable_name " " message > "/dev/stderr"
  failed = 1
  exit 1
}

function valid_port(value, number) {
  if (value !~ /^[0-9]+$/ || length(value) > 5) return 0
  number = value + 0
  return number >= 0 && number <= 65535
}

function valid_ipv4(value, parts, count, part_index) {
  if (value !~ /^[0-9.]+$/) return 0
  count = split(value, parts, ".")
  if (count != 4) return 0
  for (part_index = 1; part_index <= count; part_index++) {
    if (length(parts[part_index]) > 1 && substr(parts[part_index], 1, 1) == "0") return 0
    if (parts[part_index] == "" || parts[part_index] + 0 < 0 || parts[part_index] + 0 > 255) return 0
  }
  return 1
}

function valid_hostname(value, labels, count, label_index) {
  if (value == "" || length(value) > 253 || value !~ /^[A-Za-z0-9._-]+$/) return 0
  if (value ~ /^[0-9.]+$/) return valid_ipv4(value)
  count = split(value, labels, ".")
  for (label_index = 1; label_index <= count; label_index++) {
    if (labels[label_index] == "" || length(labels[label_index]) > 63) return 0
    if (labels[label_index] ~ /^-/ || labels[label_index] ~ /-$/) return 0
  }
  return 1
}

function valid_ipv6(value, percent, address, zone, collapsed, parts, count, groups, part_index) {
  percent = index(value, "%")
  if (percent) return 0
  address = value
  if (address !~ /:/ || address ~ /:::/ || address !~ /^[0-9A-Fa-f:.]+$/) return 0
  collapsed = address
  sub(/::/, "", collapsed)
  if (collapsed ~ /::/) return 0

  count = split(address, parts, ":")
  groups = 0
  for (part_index = 1; part_index <= count; part_index++) {
    if (parts[part_index] == "") continue
    if (parts[part_index] ~ /\./) {
      if (part_index != count || !valid_ipv4(parts[part_index])) return 0
      groups += 2
    } else {
      if (parts[part_index] !~ /^[0-9A-Fa-f]+$/ || length(parts[part_index]) > 4) return 0
      groups++
    }
  }
  return address ~ /::/ ? groups < 8 : groups == 8
}

{
  if (NR != 1) reject("must be a single-line URL")
  value = $0
  if (value ~ /[[:cntrl:][:space:]]/ || index(value, "\"") || index(value, "\\")) {
    reject("must not contain control characters, whitespace, quotes, or backslashes")
  }
  if (value !~ /^https?:\/\//) reject("must be an absolute HTTP(S) URL")
  if (value ~ /[?#]/) reject("must not contain a query string or fragment")

  rest = value
  sub(/^https?:\/\//, "", rest)
  slash = index(rest, "/")
  authority = slash ? substr(rest, 1, slash - 1) : rest
  if (authority == "") reject("must include a host")
  if (authority ~ /@/) reject("must not contain credentials")

  port = ""
  if (authority ~ /^\[/) {
    close_index = index(authority, "]")
    if (!close_index) reject("contains an invalid IPv6 host")
    host = substr(authority, 2, close_index - 2)
    suffix = substr(authority, close_index + 1)
    if (!valid_ipv6(host)) reject("contains an invalid IPv6 host")
    if (suffix != "") {
      if (suffix !~ /^:/) reject("contains an invalid host")
      port = substr(suffix, 2)
    }
  } else {
    host_with_port = authority
    colon_count = gsub(/:/, ":", host_with_port)
    if (colon_count > 1) reject("must wrap IPv6 hosts in brackets")
    colon = index(authority, ":")
    host = colon ? substr(authority, 1, colon - 1) : authority
    port = colon ? substr(authority, colon + 1) : ""
    if (!valid_hostname(host)) reject("contains an invalid host")
  }
  if (port != "" && !valid_port(port)) reject("contains an invalid port")

  while (length(value) > 0 && substr(value, length(value), 1) == "/") {
    value = substr(value, 1, length(value) - 1)
  }
  print value
}

END {
  if (!failed && NR != 1) {
    print variable_name " must be a single-line URL" > "/dev/stderr"
    exit 1
  }
}
