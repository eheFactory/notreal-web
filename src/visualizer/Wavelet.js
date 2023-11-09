import * as THREE from 'three';


/**
 * Computes the Continuous Wavelet Transform (CWT) of a given data array.
 *
 * @param {Array<number>} data - The data array to transform.
 * @param {Function} waveletFunction - The wavelet function to use.
 * @param {number} minScale - The minimum scale.
 * @param {number} maxScale - The maximum scale.
 * @param {number} scaleStep - The scale step.
 * @returns {Array<Array<number>>} - The coefficients of the transform.
 * 
 * @example
 * const result = computeCWT([1, 2, 3, 4, 5], morletWavelet, 1, 5, 1);
 */
function computeCWT(data, waveletFunction, minScale = 1, maxScale = data.length, scaleStep = 1) {
    const coefficients = [];
    const translations = data.length;

    for (let a = minScale; a <= maxScale; a += scaleStep) {
        for (let b = 0; b < translations; b++) {
            let sum = 0;
            for (let t = 0; t < data.length; t++) {
                sum += data[t] * waveletFunction((t - b) / a);
            }
            sum *= (1 / Math.sqrt(a));
            coefficients.push(sum);
        }
    }
    return coefficients;
}


/**
 * Morlet Wavelet function.
 *
 * @param {number} t - The input value.
 * @returns {number} - The wavelet value at t.
 * 
 * @example
 * const value = morletWavelet(0.5);
 */
const morletWavelet = (t) => {
    if (t > 4 || t < -4) {
        return 0; // Restrict domain to make calculations quicker
    }
    const pi = Math.PI;
    const sigma = 1; 
    const freq = 1.75;
    return Math.cos(2 * pi * freq * t) * Math.exp(-t * t / (2 * sigma * sigma));
}


/**
 * Haar Wavelet function.
 *
 * @param {number} t - The input value.
 * @returns {number} - The wavelet value at t.
 * 
 * @example
 * const value = haarWavelet(0.5);
 */
const haarWavelet = (t) => {
    if (t >= 0 && t < 0.5) {
        return 1;
    } else if (t >= 0.5 && t < 1) {
        return -1;
    }
    return 0;
}


/**
 * Daubechies Wavelet (db1) function.
 *
 * @param {number} t - The input value.
 * @returns {number} - The wavelet value at t.
 * 
 * @example
 * const value = daubechies1Wavelet(0.5);
 */
const daubechies1Wavelet = (t) => {
    if (t >= 0 && t < 0.5) {
        return Math.sqrt(2);
    } else if (t >= 0.5 && t < 1) {
        return -Math.sqrt(2);
    }
    return 0;
}


/**
 * Daubechies Wavelet (using db2 as an example).
 *
 * @param {number} t - The input value.
 * @returns {number} - The wavelet value at t.
 * 
 * @example
 * const value = daubechies2Wavelet(0.5);
 */
const daubechies2Wavelet = (t) => {
    // For the sake of simplicity, I'm using db2
    if (t >= 0 && t < 1) {
        return (1 + Math.sqrt(3)) * t - Math.sqrt(3);
    } else if (t >= 1 && t < 2) {
        return (1 - Math.sqrt(3)) * t + Math.sqrt(3) - 1;
    }
    return 0;
}


/**
 * Mexican Hat (Ricker) Wavelet function.
 *
 * @param {number} t - The input value.
 * @returns {number} - The wavelet value at t.
 * 
 * @example
 * const value = mexicanHatWavelet(0.5);
 */
const mexicanHatWavelet = (t) => {
    const c = 1 / (Math.sqrt(2 * Math.PI));
    return c * (1 - t * t) * Math.exp(-t * t / 2);
}


/**
 * Symlet2 Wavelet function.
 *
 * @param {number} t - The input value.
 * @returns {number} - The wavelet value at t.
 * 
 * @example
 * const value = symlet2Wavelet(0.5);
 */
const symlet2Wavelet = (t) => {
    // Placeholder coefficients for Sym2
    const coeffs = [
        0.48296,  // h0
        0.8365,   // h1
        0.22414,  // h2
        -0.1294   // h3
    ];

    // This is a very simplified and naive reconstruction based on the coefficients:
    let sum = 0;
    for (let i = 0; i < coeffs.length; i++) {
        sum += coeffs[i] * (t % coeffs.length === i ? 1 : 0);
    }
    return sum;
}


/**
 * Coiflet1 Wavelet function.
 *
 * @param {number} t - The input value.
 * @returns {number} - The wavelet value at t.
 * 
 * @example
 * const value = coiflet1Wavelet(0.5);
 */
const coiflet1Wavelet = (t) => {
    // Placeholder coefficients for Coif1
    const coeffs = [
        -0.01565572813,  // h0
        -0.07273261951,  // h1
        0.38486484682,   // h2
        0.85257202021,   // h3
        0.33789766246,   // h4
        -0.07273261951    // h5
    ];

    // This is a very simplified and naive reconstruction based on the coefficients:
    let sum = 0;
    for (let i = 0; i < coeffs.length; i++) {
        sum += coeffs[i] * (t % coeffs.length === i ? 1 : 0);
    }
    return sum;
}


/**
 * Biorthogonal Wavelet function.
 *
 * @param {number} t - The input value.
 * @param {string} type - Type of biorthogonal wavelet (either "decomposition" or "reconstruction").
 * @param {string} biorType - Type of bior (e.g. '1.1', '1.3', '1.5' etc).
 * @returns {number} - The wavelet value at t.
 * 
 * @example
 * const value = biorthogonalWavelet(0.5, "decomposition", "1.1");
 */
const biorthogonalWavelet = (t, type, biorType) => {
    // Define the coefficients for different bior types
    let decCoeffs, recCoeffs;

    switch(biorType) {
        case '1.1':
            decCoeffs = [0.7071, 0.7071];
            recCoeffs = [0.7071, -0.7071];
            break;
        case '1.3':
            decCoeffs = [-0.0884, -0.0112, 0.0884, -0.2020, 1.0410, -0.3192];
            recCoeffs = [0.3192, 1.0410, 0.2020, 0.0884, 0.0112, -0.0884];
            break;
        case '1.5':
            decCoeffs = [0.0164, 0.0169, -0.0649, 0.0363, 0.2912, -0.5295, 1.1062, -0.2978];
            recCoeffs = [0.2978, 1.1062, 0.5295, 0.2912, -0.0363, -0.0649, -0.0169, 0.0164];
            break;
        //... and so on for other biorthogonal types.
        default:
            throw new Error("Unsupported bior type");
    }

    const coeffs = (type === "decomposition") ? decCoeffs : recCoeffs;

    // Simple approximation of wavelet function using coefficients:
    let sum = 0;
    for (let i = 0; i < coeffs.length; i++) {
        sum += coeffs[i] * (t % coeffs.length === i ? 1 : 0);
    }
    
    return sum;
}

/**
 * Daubechies Wavelet function for a specific order.
 *
 * @param {number} t - The input value.
 * @param {number} N - The order of Daubechies wavelet (up to 10).
 * @returns {number} - The wavelet value at t.
 * @throws Will throw an error if the order is greater than 10.
 * 
 * @example
 * const value = daubechiesWavelet(0.5, 3);
 */
function daubechiesWavelet(t, N) {
    if (N > 10) {
        throw new Error('Daubechies wavelet of order greater than 10 is not supported in this implementation.');
    }

    // Coefficients for Daubechies wavelet of order N
    const coefficients = {
        1: [0.7071067811865475, 0.7071067811865475],
        2: [0.4829669702, 0.83650610351,
            0.22414386816, -0.1294095226],
        3: [0.33267055295, 0.80689150931,
            0.45987750212, -0.13501102001,
            -0.08544127388, 0.03522629189],
        4: [0.23037781331, 0.71484657055,
            0.63088076793, -0.02798376942,
            -0.18703481193, 0.03084138184,
            0.03288301167, -0.01059740179],
        5: [0.16010239869, 0.60382926980,
            0.72430852844, 0.13842814591,
            -0.24229488707, -0.03224486959,
            0.07757149384, -0.00624149021,
            -0.01258075150, 0.00333572529],
        6: [0.111540743350, 0.494623890398,
            0.751133908021, 0.315250351709,
            -0.226264693965, -0.129766867567,
            0.097501605587, 0.027522865530,
            -0.031582039318, 0.000553842201,
            0.004777257511, -0.001077301085],
        7: [0.077852054085, 0.396539319482,
            0.729132090846, 0.469782287405,
            -0.143906003929, -0.224036184994,
            0.071309219267, 0.080612609151,
            -0.038029936935, -0.016574541631,
            0.012550998556, 0.000429577973,
            -0.001801640704, 0.000353713800],
        8: [0.054415842243, 0.312871590914,
            0.675630736297, 0.585354683654,
            -0.015829105256, -0.284015542962,
            0.000472484574, 0.128747426620,
            -0.017369301002, -0.044088253931,
            0.013981027917, 0.008746094047,
            -0.004870352993, -0.000391740373,
            0.000675449406, -0.000117476784],
        9: [0.038077947364, 0.243834674613,
            0.604823123690, 0.657288078051,
            0.133197385825, -0.293273783279,
            -0.096840783223, 0.148540749338,
            0.030725681479, -0.067632829061,
            0.000250947115, 0.022361662124,
            -0.004723204758, -0.004281503682,
            0.001847646883, 0.000230385764,
            -0.000251963189, 0.000039347320],
        10: [0.026670057901, 0.188176800078,
            0.527201188932, 0.688459039454,
            0.281172343661, -0.249846424327,
            -0.195946274377, 0.127369340336,
            0.093057364604, -0.071394147166,
            -0.029457536822, 0.033212674059,
            0.003606553567, -0.010733175483,
            0.001395351747, 0.001992405295,
            -0.000685856695, -0.000116466855,
            0.000093588670, -0.000013264203]
    };
    const coefs = coefficients[N];
    let result = 0;

    // Basic approach to reconstruction based on the coefficients:
    for (let i = 0; i < coefs.length; i++) {
        result += coefs[i] * (t % 1 === i / (coefs.length - 1) ? 1 : 0);
    }

    return result;
}


const WaveletVisualization = (visualizer) => {
    const { scene, analyser, dataArray } = visualizer;

    // Set up geometry and material for bars in the visualization
    const barGeometry = new THREE.BoxGeometry(1, 1, 1);
    const barMaterials = [];
    const RADIUS = 100;  // Define a radius for the orbital bars
    const bars = [];  // Store bars separately to avoid confusion with scene.children

    for (let i = 0; i < dataArray.length; i++) {
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        barMaterials.push(material);
        const bar = new THREE.Mesh(barGeometry, material);
        
        // Position bars in a circular manner
        const theta = (i / dataArray.length) * 2 * Math.PI;
        bar.position.x = RADIUS * Math.sin(theta);
        bar.position.z = RADIUS * Math.cos(theta);

        bars.push(bar);  // Store in bars array
        scene.add(bar);
    }

    const animate = () => {
        // Fetch fresh data into dataArray
        analyser.getByteFrequencyData(dataArray);

        // Compute CWT using the desired wavelet. Replace haarWavelet with the one you want.
        const coefficients = computeCWT(dataArray, haarWavelet);

        for (let i = 0; i < coefficients.length && i < bars.length; i++) {
            const barHeight = coefficients[i];

            const bar = bars[i];
            
            // Guard clause
            if (!bar || !bar.scale) {
                console.error("Bar not found or improperly defined:", i, bar);
                continue;  // Skip to next iteration
            }
            
            bar.scale.y = barHeight;
            bar.position.y = barHeight / 2;

            // Set the color based on height (example coloring logic)
            const r = Math.floor(barHeight * 255);
            const g = Math.floor(255 * (i / coefficients.length));
            const b = 50;
            barMaterials[i].color.setRGB(r / 255, g / 255, b / 255);
        }

        requestAnimationFrame(animate);
    }

    animate();  // Start animating the bars
};



export default WaveletVisualization;