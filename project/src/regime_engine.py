from .indicators import logistic_map_to_0_100, zscore_hybrid


def compute_regime_indices(panel, ind, rets, corr_avg, corr_z):
    n = len(panel['Date'])
    tri = []
    vsi = []
    cri = []
    lmi = []
    voi = []

    hy = 'HY_PROXY'
    hy_z = zscore_hybrid(panel[hy]) if hy in panel and all(x is not None for x in panel[hy]) else None
    for i in range(n):
        eqs = [x for x in ['US_EQ', 'EU_EQ', 'JP_EQ', 'EM_EQ', 'CN_EQ'] if x in ind]
        ma_sig = sum(1 if ind[e]['ma_10w'][i] > ind[e]['ma_40w'][i] else -1 for e in eqs) / max(1, len(eqs))
        mom = sum(ind[e]['ret_13w'][i] + 0.5 * ind[e]['ret_52w'][i] for e in eqs) / max(1, len(eqs))
        dd = sum(ind[e]['dd_52w'][i] for e in eqs) / max(1, len(eqs))
        x_tri = 1.2 * ma_sig + 5 * mom + 3 * dd
        tri.append(logistic_map_to_0_100(x_tri))

        usv = ind['US_EQ']['rv_13w'][i] if 'US_EQ' in ind else 0
        vexp = (ind['US_EQ']['rv_4w'][i] - ind['US_EQ']['rv_26w'][i]) if 'US_EQ' in ind else 0
        x_vsi = -18 * usv - 25 * max(0, vexp) - 1.5 * max(0, corr_avg[i])
        vsi.append(logistic_map_to_0_100(x_vsi))

        if hy in ind and hy_z is not None:
            hy_m = ind[hy]['ret_13w'][i]
            hy_lv = hy_z[i]
            x_cri = -3.5 * hy_lv + 8 * hy_m
        else:
            x_cri = -2.0
        cri.append(logistic_map_to_0_100(x_cri))

        dxy_m = ind['DXY']['ret_13w'][i] if 'DXY' in ind else 0.0
        dxy_ma = (1 if ind['DXY']['ma_10w'][i] > ind['DXY']['ma_40w'][i] else -1) if 'DXY' in ind else 0
        x_lmi = -3 * dxy_m - 0.8 * dxy_ma
        lmi.append(logistic_map_to_0_100(x_lmi))

        us_eq_price = panel['US_EQ'][i] if 'US_EQ' in panel and i < len(panel['US_EQ']) else None
        us_eq_ma40 = ind['US_EQ']['ma_40w'][i] if 'US_EQ' in ind else None
        ext = (us_eq_price / us_eq_ma40 - 1) if us_eq_price not in (None, 0) and us_eq_ma40 not in (None, 0) else 0.0
        accel = ind['US_EQ']['ret_4w'][i] - ind['US_EQ']['ret_13w'][i] if 'US_EQ' in ind else 0.0
        x_voi = -5 * ext - 4 * accel
        voi.append(logistic_map_to_0_100(x_voi))

    grs = [0.25 * tri[i] + 0.20 * vsi[i] + 0.20 * cri[i] + 0.20 * lmi[i] + 0.15 * voi[i] for i in range(n)]

    zones = []
    for x in grs:
        if x >= 80:
            zones.append('Strong Expansion')
        elif x >= 60:
            zones.append('Expansion')
        elif x >= 40:
            zones.append('Neutral')
        elif x >= 20:
            zones.append('Deterioration')
        else:
            zones.append('Crisis')

    return {'TRI': tri, 'VSI': vsi, 'CRI': cri, 'LMI': lmi, 'VOI': voi, 'GRS': grs, 'Zone': zones, 'corr_z': corr_z, 'corr_avg': corr_avg}
