def compute_ashtakavarga(*args, **kwargs):
    """
    Final safe entrypoint — drop this into the ashtakavarga module your app imports.
    - Primary use (recommended): compute_ashtakavarga(rows=rows_list, debug=False)
      where rows_list is the exact list returned by calc_full_table().
    - Backwards-compatible: compute_ashtakavarga(year,month,day,hour,minute,second, tz, lat, lon, debug=False)
      The shim will attempt to detect & correct the (tz,lat,lon) vs (lat,lon,tz) ordering and call calc_full_table.
    - Ensures output ALWAYS contains:
        result["ashtakavarga"]["sarva_points"] -> list of 12 ints
        result["ashtakavarga"]["sarva_tamil"]  -> dict in correct Tamil order (மேஷம்..மீனம்)
        result["ashtakavarga"]["lagna_highlight"] -> Tamil name or None
    - Does NOT modify UI files.
    """
    debug = bool(kwargs.get("debug", False))

    # helper: canonical Tamil rasi order used by your UI
    _RASI_TAMIL_LOCAL = [
        "மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி",
        "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"
    ]

    # helper to normalize final shape
    def _ensure_shape(res: dict) -> dict:
        if not isinstance(res, dict):
            return {"status": "error", "error": "invalid engine result"}

        asht = res.get("ashtakavarga")
        if not isinstance(asht, dict):
            asht = {}
            res["ashtakavarga"] = asht

        # ensure sarva_points list of 12
        sp = asht.get("sarva_points")
        if not (isinstance(sp, list) and len(sp) == 12):
            # try build from sarva_tamil dict
            st = asht.get("sarva_tamil", {})
            if isinstance(st, dict) and len(st) >= 1:
                sp = [int(st.get(r, 0) or 0) for r in _RASI_TAMIL_LOCAL]
            else:
                sp = [int(x) if isinstance(x, (int, float)) else 0 for x in (asht.get("sarva_points") or [0]*12)]
                if len(sp) != 12:
                    sp = [0]*12
            asht["sarva_points"] = sp

        # ensure sarva_tamil dict in correct order
        st = asht.get("sarva_tamil")
        if not (isinstance(st, dict) and len(st) == 12):
            asht["sarva_tamil"] = { _RASI_TAMIL_LOCAL[i]: int(asht["sarva_points"][i]) for i in range(12) }

        # ensure lagna_highlight exists (try numeric lagna keys)
        if "lagna_highlight" not in asht:
            lag_no = res.get("lagna") or asht.get("lagna") or asht.get("lagna_no")
            try:
                if isinstance(lag_no, (int, float)) and 1 <= int(lag_no) <= 12:
                    asht["lagna_highlight"] = _RASI_TAMIL_LOCAL[int(lag_no)-1]
                else:
                    asht["lagna_highlight"] = None
            except Exception:
                asht["lagna_highlight"] = None

        res["ashtakavarga"] = asht
        return res

    # 1) If rows is provided in kwargs
    if "rows" in kwargs and isinstance(kwargs["rows"], list):
        rows = kwargs["rows"]
        # prefer to call internal compute_ashtakavarga_from_rows if available
        try:
            out = compute_ashtakavarga_from_rows(rows, debug=debug)
        except NameError:
            # fallback: if function absent, try to import (rare)
            try:
                from ashtakavarga_calc import compute_ashtakavarga_from_rows as _fn
                out = _fn(rows, debug=debug)
            except Exception as e:
                return {"status": "error", "error": "engine missing compute_ashtakavarga_from_rows: " + str(e)}
        return _ensure_shape(out)

    # 2) If first positional arg is rows list
    if args and isinstance(args[0], list):
        rows = args[0]
        try:
            out = compute_ashtakavarga_from_rows(rows, debug=debug)
        except NameError:
            try:
                from ashtakavarga_calc import compute_ashtakavarga_from_rows as _fn
                out = _fn(rows, debug=debug)
            except Exception as e:
                return {"status": "error", "error": "engine missing compute_ashtakavarga_from_rows: " + str(e)}
        return _ensure_shape(out)

    # 3) Legacy numeric args path: try to build rows by calling calc_full_table.
    #    We will attempt to interpret the last three numeric args as (lat,lon,tz) even if app passed (tz,lat,lon).
    #    This avoids changing app.py.
    try:
        from app_stable_backup import calc_full_table as _calc_full_table
    except Exception:
        _calc_full_table = None

    if len(args) >= 9 and _calc_full_table is not None:
        # capture first 9 values
        y, mo, d, hr, mi, sec, a7, a8, a9 = args[:9]
        # attempt to coerce to floats to decide likely ordering
        def _to_float(v):
            try:
                return float(v)
            except Exception:
                return None
        f7, f8, f9 = _to_float(a7), _to_float(a8), _to_float(a9)

        # Heuristic: timezone is typically small (e.g. 5.5), latitude in [-90..90], longitude in [-180..180]
        chosen = None
        if f7 is not None and f8 is not None and f9 is not None:
            # pick the permutation where lat/ lon values fall in plausible ranges and tz in plausible range
            cand_perms = [
                (f7, f8, f9),  # as given
                (f8, f9, f7),
                (f9, f7, f8)
            ]
            for lat_c, lon_c, tz_c in cand_perms:
                if -90 <= lat_c <= 90 and -180 <= lon_c <= 180 and -12 <= tz_c <= 14:
                    chosen = (lat_c, lon_c, tz_c)
                    break
            if chosen is None:
                # fallback: if one candidate has tz in typical timezone range, choose that perm
                for lat_c, lon_c, tz_c in cand_perms:
                    if -12 <= tz_c <= 14:
                        chosen = (lat_c, lon_c, tz_c)
                        break
        else:
            # if conversion failed, try naive cast order (assume a7=lat,a8=lon,a9=tz)
            try:
                chosen = (float(a7), float(a8), float(a9))
            except Exception:
                chosen = None

        if chosen is None:
            return {"status":"error","error":"cannot interpret legacy numeric args for calc_full_table; pass rows instead"}

        lat_val, lon_val, tz_val = chosen

        # call calc_full_table with correct ordering expected by your calc (year,month,day,hour,minute,second,lat,lon,tz,...)
        try:
            sig = inspect.signature(_calc_full_table)
            param_count = len(sig.parameters)
            call_args = [y, mo, d, hr, mi, sec, lat_val, lon_val, tz_val][:param_count]
            rows = _calc_full_table(*call_args)
        except Exception as e:
            return {"status":"error","error":"calc_full_table failed in shim: " + str(e)}

        try:
            out = compute_ashtakavarga_from_rows(rows, debug=debug)
        except Exception as e:
            return {"status":"error","error":"compute_ashtakavarga_from_rows failed: " + str(e)}
        return _ensure_shape(out)

    # 4) nothing usable provided
    return {"status": "error", "error": "compute_ashtakavarga requires rows list (preferred) or legacy numeric args (y,m,d,h,mi,s, tz/lat/lon)"}
