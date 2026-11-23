"use strict";

(function() {
	var coplanar = (function() {
		var coplanar = {};
		// calculates the Gauss-Chebyshev quadrature (https://en.wikipedia.org/wiki/Chebyshev%E2%80%93Gauss_quadrature)
		function gcquad (f, order) {
			var y = 0.0;
			for (var i = 0; i < order; i++) {
				y += Math.PI/order * f(Math.cos((2*i+1)*Math.PI/(2*order)));
			} 
			return y;
		}

		// variable transform to turn a -> -1, b -> +1 for GC quadrature
		function gctransform (a, b, f) {
			//console.log('Transforming f from ('+a+','+b+') to (-1,+1)');
			return function (znew) {return f((znew*0.5)*(a-b)+(a+b)*0.5); }; //TODO:this line is most probably wrong
		}

		// returns the function w(z) of the conformal transform of a CPW
		// (https://link.springer.com/article/10.1007%2FBF01673907)
		// but without two neighboring branching point
		function conformal_derivative_gc (branching_points, zeros, starting_point_id) {
			var branching_point_num = branching_points.length;
			var zero_num = zeros.length;
			var integrand = function (z) {
				//console.log ("Branching points: "+branching_points+", z: "+z)
				var f = 1.0;
				for (var branching_point_id = 0; branching_point_id < branching_point_num; branching_point_id++) {
					if (branching_point_id < starting_point_id) {
						f /= Math.sqrt(z-branching_points[branching_point_id])
					} else if (branching_point_id > starting_point_id + 1) {
						f /= Math.sqrt(branching_points[branching_point_id]-z)
					}
				}	
				for (var zero_id = 0; zero_id < zero_num; zero_id++) {
					f *= z-zeros[zero_id];
				}
				return f;
			}
			return integrand
		}

		function conformal_delta (branching_points, zeros, starting_point_id, n) {
			var integrand = conformal_derivative_gc(branching_points, zeros, starting_point_id);
			var dw = gcquad(
				gctransform(
					branching_points[starting_point_id], 
					branching_points[starting_point_id+1], 
					integrand), 
				n);
			return dw;
		}

		function conformal_branching_points (branching_points, zeros, n) {
			var branching_point_num = branching_points.length;
			var w = [[0, 0]];
			var _w = [0, 0];
			for (var i = 1; i < branching_point_num; i++) {
				var dw = conformal_delta(branching_points, zeros, i-1, n)
				//integrand = conformal_derivative_gc(branching_points, zeros, i-1);
				//dw = gcquad(gctransform(branching_points[i-1], branching_points[i], integrand), n);
				// branching point id decides which direction we are moving now.
				// Schwarz-Christoffel mapping: each branching point we are rotating by 90 degress counterclockwise.
				if (i % 4 == 0) {
					_w = [_w[0]+dw, _w[1]];
				} else if (i % 4 == 1) {
					_w = [_w[0], _w[1]+dw];
				} else if (i % 4 == 2) {
					_w = [_w[0]-dw, _w[1]];
				} else {
					_w = [_w[0], _w[1]-dw];
				}
				w.push(_w)
			}
			return w
		}

		// root finding algorithm: Newton-Gauss
		// requires inverting the jacobian matrix (which is ok in this problem)
		function find_zeros (branching_points, starting_point_ids, ngc, nng) {
			// initial guesses for zeros: middles of intervals 
			// (branching_points[starting_point_ids[0]], branching_points[starting_point_ids[0]+1]
			var zeros = [];
			var num_zeros = starting_point_ids.length;
			for (var i = 0; i < num_zeros; i++) {
				zeros.push((branching_points[starting_point_ids[i]]+branching_points[starting_point_ids[i]+1])*0.5);
			}
			// nng: number of iterations
			for (var it=0; it<nng; it++) {
				var dws = []; // function values
				var J = [] // jacobian matrix
				for (var i=0; i< num_zeros; i++) {
					// ngc: number of gauss-chebyshev iterations
					dws.push(conformal_delta(branching_points, zeros, starting_point_ids[i], ngc));
					var Jcol = [];
					for (var j=0; j< num_zeros; j++) {
						// exclude the current zero from zeros
						var zeros_without_j = zeros.slice(0, j).concat(zeros.slice(j+1, num_zeros));
						Jcol.push(conformal_delta(branching_points, zeros_without_j, starting_point_ids[i], ngc));
					}
					J.push(Jcol);
				}
				// we have the system values and the jacobian matrix. Now we need to invert the matrix.
				if (typeof require !== 'undefined') // if we are in node.js, we require. If we are in the browser, assume numeric is already loaded.
					var numeric = require('numeric'); // we need this for inverse matrix (for J)
				else
					var numeric = window.numeric;
				//Jinv = numeric.inv(J)
				var zeros = numeric.add(zeros, numeric.solve(J, dws));
				//console.log ('dws: '+dws);
				//console.log ('J: '+J);
				//console.log ('x: '+zeros);
			}
			return zeros;
		}
		// calculates the dimensionaless capacitance matrix inside a dmain (or inductance matrix if true mode 
		// is not 'cpw' but 'microstrip')
		function capacitance_matrix_domain (branching_points, ngc, nng, mode) {
			if (mode != 'cpw') {
				return False;
			}
			// mode is CPW. The electrodes are enumerated with 2, 4, 6, 8, ...
			var num_branching_points = branching_points.length;
			var C = []
			for (var branching_point_id = 1; branching_point_id < num_branching_points-1; branching_point_id += 2) {
				var starting_point_ids = []
				for (var starting_point_id = 0; starting_point_id < num_branching_points; starting_point_id += 2) {
					if ((starting_point_id != branching_point_id-1) && (starting_point_id != branching_point_id+1)) {
						starting_point_ids.push(starting_point_id);
					}
				}
				var zeros = find_zeros(branching_points, starting_point_ids, ngc, nng);
				var w = conformal_branching_points(branching_points, zeros, ngc);
				var potential = w[branching_point_id][1];
				//console.log('zeros: '+zeros);
				//console.log('w: '+w);
				//console.log('potential: '+potential);
				var c = [];
				for (var electrode_id = 1; electrode_id < num_branching_points/2; electrode_id++) {
					c.push((w[electrode_id*2-1][0]-w[electrode_id*2][0])/potential);
				}
				C.push(c);
			}
			return C;
		}

		function LC (branching_points, ngc, nng, epsilon_eff, mu_eff, mode) {
			var epsilon_0 = 8.85418782e-12;
			var mu_0 = 1.25663706e-6;
			
			if (mode != 'cpw') {
				return False;
			}
			if (typeof require !== 'undefined') // if we are in node.js, we require. If we are in the browser, assume numeric is already loaded.
				var numeric = require('numeric'); // we need this for inverse matrix (for L)
			else
				var numeric = window.numeric;
			var Cd = numeric.mul(capacitance_matrix_domain(branching_points, ngc, nng, mode), 2);
			var Ld = numeric.inv(Cd);
			var C = numeric.mul(Cd, epsilon_0*epsilon_eff);
			var L = numeric.mul(Ld, mu_0*mu_eff);
			return [L, C];
		}
		
		// calculates first-order-corrected complex resonance frequency
		function fc(l1, l2, lc, Zt1, Zt2, Z1, Z2, Zi, Zo, Zr, kappa, n, epsilon, mu) {
			if (typeof require !== 'undefined') // if we are in node.js, we require. If we are in the browser, assume numeric is already loaded.
				var complex = require('complex.js'); // we need this for inverse matrix (for J)
			else
				var complex = window.Complex;
			var I = complex('i');
			if ((Zt1 == 'short' && Zt2 == 'short') || (Zt1 == 'open' && Zt2 == 'open')) { // lambda/2
				var lo = l1;
				var ls = l2;
				var f0 = 2.0*n/(4.0*Math.sqrt(epsilon*mu)*(l1+l2+lc))
			} else if (Zt1 == 'open' && Zt2 == 'short'){ // lambda/4
				var lo = l1;
				var ls = l2;
				var f0 = (2.0*n-1.0)/(4.0*Math.sqrt(epsilon*mu)*(l1+l2+lc))
			} else { // lambda/4
				var lo = l2;
				var ls = l1;
				var f0 = (2.0*n-1.0)/(4.0*Math.sqrt(epsilon*mu)*(l1+l2+lc))
			}
				//console.log(1.0/Math.sqrt(epsilon*mu), (l1+l2+lc), f0)
			// formula (37)
			var psi = 2.0*Math.PI*(lc+2.0*lo)*f0*Math.sqrt(epsilon*mu);
			var theta = 2.0*Math.PI*lc*f0*Math.sqrt(epsilon*mu);
			// formula (35)
			// impedances are complex numbers
			Z1 = complex(Z1);
			Z2 = complex(Z2);
			Zi = complex(Zi);
			Zo = complex(Zo);
			Zr = complex(Zr);
			var feedline_characteristic = Z1.mul(Zi.add(Zo)).mul(Math.cos(theta)).sub(I.mul(Z1.mul(Z1).add(Zi.mul(Zo))).mul(Math.sin(theta)));
			// formula (36)
			if (Zt1 == 'short' && Zt2 == 'short') { // lambda/2 (39)
				var dDdf = I.mul(-32.0*Math.PI*Math.sqrt(epsilon*mu)*(-1)**n*(lo+ls+lc)).mul(Zr).mul(feedline_characteristic);
				var dDdZ2 = I.mul(-16.0*(-1)**n*Math.sin(theta)*Math.cos(psi)).mul(feedline_characteristic);
				var d2Ddkappa2 = I.mul(16.0*(-1)**n*Math.sin(theta)).mul(Zr).mul(
					Z1.mul(Zo.sub(Zi)).mul(Math.sin(psi)*Math.sin(theta)).sub(
					Z1.mul(Zi.add(Zo)).mul(2.0*Math.cos(psi)*Math.cos(theta)-1.0)).add(
					I.mul(Z1.mul(Z1.mul(3.0)).add(Zi.mul(Zo))).mul(Math.sin(theta)*Math.cos(psi))))
			} else if (Zt1 == 'open' && Zt2 == 'open'){ // lambda/2
				var dDdf = I.mul(-32.0*Math.PI*Math.sqrt(epsilon*mu)*(-1)**n*(lo+ls+lc)).mul(Zr).mul(feedline_characteristic);
				var dDdZ2 = I.mul(16.0*(-1)**n*Math.sin(theta)*Math.cos(psi)).mul(feedline_characteristic);
				var d2Ddkappa2 = I.mul(16.0*(-1)**n*Math.sin(theta)).mul(Zr).mul(
					Z1.mul(Zo.sub(Zi)).mul(Math.sin(psi)*Math.sin(theta)).sub(
					Z1.mul(Zi.add(Zo)).mul(2.0*Math.cos(psi)*Math.cos(theta)+1.0)).add(
					I.mul(Z1.mul(Z1).mul(3.0).add(Zi.mul(Zo))).mul(Math.sin(theta)*Math.cos(psi))))
			} else { // lambda/4
				var dDdf = feedline_characteristic.mul(-32.0*Math.PI*Math.sqrt(epsilon*mu)*(-1)**n*(lo+ls+lc)).mul(Zr);
				var dDdZ2 = feedline_characteristic.mul(16.0*((-1)**n)*Math.sin(theta)*Math.cos(psi));
				var d2Ddkappa2 = 
					Z1.mul(Zo.sub(Zi)).mul(Math.sin(psi)*Math.sin(theta)).sub(
					Z1.mul(Zi.add(Zo)).mul(2.0*Math.cos(psi)*Math.cos(theta)+1.0)).add(
					I.mul(Z1.mul(Z1).mul(3.0).add(Zi.mul(Zo))).mul(Math.sin(theta)*Math.cos(psi))).mul(Zr).mul(16.0*(-1)**n*Math.sin(theta))
					/*console.log(Z1.mul(Zo.sub(Zi)).mul(Math.sin(psi)*Math.sin(theta)).mul(Zr).mul(16.0*(-1)**n*Math.sin(theta)).mul(Zr.mul(Zr)))
					console.log(Z1.mul(Zi.add(Zo)).mul(2.0*Math.cos(psi)*Math.cos(theta)+1.0).mul(Zr).mul(16.0*(-1)**n*Math.sin(theta)).mul(Zr.mul(Zr)))
					console.log(Z1.mul(Z1).mul(3.0).add(Zi.mul(Zo)).mul(Math.sin(theta)*Math.cos(psi)).mul(Zr).mul(16.0*(-1)**n*Math.sin(theta)).mul(Zr.mul(Zr)))*/
			}
			var fc = complex(f0).sub(dDdZ2.mul(Z2.sub(Zr)).add(d2Ddkappa2.mul(kappa**2*0.5)).div(dDdf));
			/*console.log('f0: ', f0)
			console.log('psi: ', psi)
			console.log('theta: ', theta)
			console.log('feedline_characteristic: ', feedline_characteristic)
			console.log('dDdf: ', dDdf.mul(Zr.mul(Zr)))
			console.log('dDdZ2: ', dDdZ2.mul(Zr.mul(Zr)))
			console.log('d2Ddkappa2: ', d2Ddkappa2.mul(Zr.mul(Zr)));*/
			return fc;
		}
		
		coplanar.gcquad = gcquad;
		coplanar.gctransform = gctransform;
		coplanar.conformal_derivative_gc = conformal_derivative_gc;
		coplanar.conformal_delta = conformal_delta;
		coplanar.conformal_branching_points = conformal_branching_points;
		coplanar.find_zeros = find_zeros;
		coplanar.capacitance_matrix_domain = capacitance_matrix_domain;
		coplanar.LC = LC;
		coplanar.fc = fc;
		
		return coplanar;
	})();
	
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
		module.exports = coplanar;
	else
		window.coplanar = coplanar;
})();