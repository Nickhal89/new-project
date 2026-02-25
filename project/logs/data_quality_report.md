# Data Quality Report
Status: **FAIL**

## Gate Fail Reasons
- missing series: US_EQ
- missing series: EU_EQ
- missing series: JP_EQ
- missing series: EM_EQ
- missing series: CN_EQ
- missing series: AGG_BOND
- missing series: GOLD
- missing series: DXY
- source fetch failures for US_EQ: ['stooq:^spx -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'yahoo:^GSPC -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'all sources failed']
- source fetch failures for EU_EQ: ['stooq:vgk.us -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'yahoo:VGK -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'all sources failed']
- source fetch failures for JP_EQ: ['stooq:ewj.us -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'yahoo:EWJ -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'all sources failed']
- source fetch failures for EM_EQ: ['stooq:eem.us -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'yahoo:EEM -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'all sources failed']
- source fetch failures for CN_EQ: ['stooq:fxi.us -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'yahoo:FXI -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'all sources failed']
- source fetch failures for AGG_BOND: ['stooq:agg.us -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'yahoo:AGG -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'all sources failed']
- source fetch failures for GOLD: ['stooq:gld.us -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'yahoo:GLD -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'all sources failed']
- source fetch failures for DXY: ['yahoo:DX-Y.NYB -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'fred:DTWEXBGS -> <urlopen error Tunnel connection failed: 403 Forbidden>', 'all sources failed']

## Source Mapping