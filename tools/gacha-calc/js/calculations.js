/**
 * Get the probability of pulling a 6-star on a specific pull number (within a pity cycle).
 * - Pulls 1-64: base rate 0.8% (0.008)
 * - Pulls 65-79: 0.8% + 5% per pull past 64. (pull 65 = 5.8%, pull 66 = 10.8%, ...)
 * - Pull 80: guaranteed (100%)
 * @param {number} pull - Pull number within pity cycle (1-80)
 * @returns {number} probability 0-1
 */
export function getSixStarRate(pull) {
    if (pull <= 64) return 0.008;
    if (pull >= 80) return 1.0;
    return 0.008 + (pull - 64) * 0.05;
}

/**
 * Compute the CDF for getting at least one featured character within N pulls.
 * Accounts for pity, the 50/50 system, and the 120-pull banner safety net.
 *
 * State machine with (pity: 0-79, isGuaranteed: bool) tracking probability mass.
 * At pull 120, all remaining mass is absorbed (banner safety net — guaranteed featured).
 *
 * @param {number} maxPulls - Maximum number of pulls to compute CDF for
 * @param {number} startPity - Current pity count (0-79), 0 means fresh
 * @param {boolean} guaranteed - Whether next 6-star is guaranteed featured
 * @returns {Float64Array} cdf - Array of length maxPulls+1, where cdf[n] = P(got featured within n pulls), cdf[0] = 0
 */
export function computeFeaturedCDF(maxPulls, startPity, guaranteed) {
    const cdf = new Float64Array(maxPulls + 1);
    cdf[0] = 0;

    const massNonGuaranteed = new Float64Array(80);
    const massGuaranteed = new Float64Array(80);

    if (guaranteed) {
        massGuaranteed[startPity] = 1.0;
    } else {
        massNonGuaranteed[startPity] = 1.0;
    }

    let absorbed = 0.0;

    for (let pull = 1; pull <= maxPulls; pull++) {
        const newNonGuaranteed = new Float64Array(80);
        const newGuaranteed = new Float64Array(80);

        for (let pity = 0; pity < 80; pity++) {
            const mNG = massNonGuaranteed[pity];
            const mG = massGuaranteed[pity];
            if (mNG === 0 && mG === 0) continue;

            const rate = getSixStarRate(pity + 1);
            const noStar = 1 - rate;

            if (mNG > 0) {
                if (noStar > 0 && pity + 1 < 80) {
                    newNonGuaranteed[pity + 1] += mNG * noStar;
                }
                absorbed += mNG * rate * 0.5;
                newGuaranteed[0] += mNG * rate * 0.5;
            }

            if (mG > 0) {
                if (noStar > 0 && pity + 1 < 80) {
                    newGuaranteed[pity + 1] += mG * noStar;
                }
                absorbed += mG * rate;
            }
        }

        // 120-pull safety net: all remaining mass gets featured character
        if (pull >= 120) {
            for (let i = 0; i < 80; i++) {
                absorbed += newNonGuaranteed[i] + newGuaranteed[i];
                newNonGuaranteed[i] = 0;
                newGuaranteed[i] = 0;
            }
        }

        for (let i = 0; i < 80; i++) {
            massNonGuaranteed[i] = newNonGuaranteed[i];
            massGuaranteed[i] = newGuaranteed[i];
        }

        cdf[pull] = absorbed;
    }

    return cdf;
}

/**
 * Compute expected number of pulls to get featured character.
 * @param {number} startPity - Current pity count (0-79)
 * @param {boolean} guaranteed - Whether next 6-star is guaranteed
 * @returns {number} expected pulls
 */
export function expectedPulls(startPity, guaranteed) {
    const N = 120;
    const cdf = computeFeaturedCDF(N, startPity, guaranteed);
    let e = 0;
    for (let i = 0; i < N; i++) {
        e += 1 - cdf[i];
    }
    return e;
}

/**
 * Find the pull number at which CDF reaches a given threshold.
 * @param {Float64Array} cdf
 * @param {number} threshold - e.g. 0.5, 0.75, 0.9
 * @returns {number} pull number, or -1 if never reached within the CDF range
 */
export function pullsForProbability(cdf, threshold) {
    for (let i = 0; i < cdf.length; i++) {
        if (cdf[i] >= threshold) return i;
    }
    return -1;
}

/**
 * Multi-banner planning: given total pulls and N banners, compute per-banner success probability.
 *
 * Each banner starts fresh (pity=0, guaranteed=false) unless it's the first banner
 * which uses the user's current pity/guaranteed state. The 120-pull safety net is
 * per-banner and does not carry over.
 *
 * @param {number} totalPulls - Total available pulls
 * @param {number} bannerCount - Number of banners to plan for
 * @param {number} startPity - Current pity for first banner (0-79)
 * @param {boolean} startGuaranteed - Whether first banner has guarantee
 * @returns {Array<{probability: number, expectedPulls: number, remainingAfter: number}>}
 */
export function planMultiBanner(totalPulls, bannerCount, startPity, startGuaranteed) {
    const results = [];
    let remaining = totalPulls;

    for (let i = 0; i < bannerCount; i++) {
        const pity = i === 0 ? startPity : 0;
        const guar = i === 0 ? startGuaranteed : false;

        const budget = Math.floor(remaining);
        if (budget <= 0) {
            results.push({ probability: 0, expectedPulls: 0, remainingAfter: remaining });
            continue;
        }

        const cdf = computeFeaturedCDF(budget, pity, guar);
        const probability = cdf[budget];

        let exp = 0;
        for (let j = 0; j < budget; j++) {
            exp += 1 - cdf[j];
        }

        remaining = Math.max(0, remaining - exp);
        results.push({ probability, expectedPulls: exp, remainingAfter: remaining });
    }

    return results;
}
