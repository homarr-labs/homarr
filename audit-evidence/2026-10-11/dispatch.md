# Dispatch blueprint

17 slots: coordinator plus 16 file auditors in wave 1; 8 file auditors plus 7 direct-code overview reviewers in wave 2. Heavy benchmarks are serialized. Implementations start only after baseline evidence.

| Agent | Responsibilities | Files | Lines | Assignment |
|---|---|---:|---:|---|
| audit_01 | Board and shell UI | 200 | 20174 | assignments/audit_01.json |
| audit_02 | Management catalogs and integrations | 70 | 7755 | assignments/audit_02.json |
| audit_03 | Management tools and administration | 109 | 7901 | assignments/audit_03.json |
| audit_04 | Assistant and custom-widget editors | 160 | 25512 | assignments/audit_04.json |
| audit_05 | App routes and startup | 71 | 4554 | assignments/audit_05.json |
| audit_06 | Widgets A | 132 | 17009 | assignments/audit_06.json |
| audit_07 | Widgets B | 134 | 17009 | assignments/audit_07.json |
| audit_08 | Widgets C | 140 | 17008 | assignments/audit_08.json |
| audit_09 | Custom-widget core and server | 62 | 11829 | assignments/audit_09.json |
| audit_10 | Custom-widget runtime and workbench | 58 | 6872 | assignments/audit_10.json |
| audit_11 | API foundation boards apps | 70 | 10605 | assignments/audit_11.json |
| audit_12 | API integration data | 75 | 8429 | assignments/audit_12.json |
| audit_13 | API tools and administrative routers | 26 | 3453 | assignments/audit_13.json |
| audit_14 | Media integrations and clients | 110 | 10443 | assignments/audit_14.json |
| audit_15 | Infrastructure integrations and statistics | 115 | 14271 | assignments/audit_15.json |
| audit_16 | Documentation executable code | 161 | 15185 | assignments/audit_16.json |
| audit_17 | Database and authentication | 55 | 4417 | assignments/audit_17.json |
| audit_18 | Server services caches and jobs | 175 | 10424 | assignments/audit_18.json |
| audit_19 | UI forms and modals | 105 | 5751 | assignments/audit_19.json |
| audit_20 | Board state onboarding and spotlight | 96 | 9046 | assignments/audit_20.json |
| audit_21 | Domain utilities validation and locales | 120 | 7093 | assignments/audit_21.json |
| audit_22 | Workshop services | 23 | 3911 | assignments/audit_22.json |
| audit_23 | Operations and Go developer CLI | 66 | 9857 | assignments/audit_23.json |
| audit_24 | Build configuration scripts and deployment | 54 | 3827 | assignments/audit_24.json |

Every assignment contains exact file paths, dependencies, questions and expected evidence. Files >=500 lines require a dedicated full-file pass. Every assigned file must be inspected individually; agents must mark incompleteness honestly.

Overview reviewers A-G: client bundles, client lifecycle, server lifecycle, API/RSC/WS payloads, background integrations, build/startup, and whole-application journeys. Their exact cross-cutting assignments are written before wave 2.

Excluded files retain individual reasons in inventory.json; generated assets and data are inventoried by byte size and reviewed through their loading paths.

| Overview | Responsibilities | Exact assignment |
|---|---|---|
| A | Client bundles and dependency boundaries | assignments/overview_a.json |
| B | Client memory and lifecycle | assignments/overview_b.json |
| C | Server process memory and request lifecycle | assignments/overview_c.json |
| D | API RSC hydration and WebSocket payloads | assignments/overview_d.json |
| E | Background services and integrations | assignments/overview_e.json |
| F | Build and startup memory | assignments/overview_f.json |
| G | Whole-application journeys and combined behavior | assignments/overview_g.json |
