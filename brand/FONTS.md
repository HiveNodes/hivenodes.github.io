# Fonts (all self-hosted, latin subsets in fonts/)

| family | file | axes / weights | licence | source |
|---|---|---|---|---|
| Host Grotesk | HostGrotesk-latin.woff2 | variable, wght 300–800 | SIL Open Font License 1.1 | Google Fonts open-source catalogue (OFL), subset locally |
| IBM Plex Mono | IBMPlexMono-400-latin.woff2, IBMPlexMono-500-latin.woff2 | 400, 500 | SIL Open Font License 1.1 | IBM Plex (OFL), subset locally |

Why these and not Inter + JetBrains Mono (the brief's example): both families are already subset, self-hosted and measured by the
verify suite (fontcheck.mjs proves the face is applied by measured width); Host Grotesk's variable weight axis covers the instrument
type scale. No font is fetched from any third party.
