import {beforeEach,expect,it} from 'vitest'
import {tour,startTour,pauseTour,advanceTour,autoTour} from './useTour'
beforeEach(()=>{localStorage.clear();localStorage.setItem('user',JSON.stringify({id:1}));localStorage.setItem('role','admin');tour.open=false})
it('first run starts the tour and a skipped tour resumes at the saved step',()=>{autoTour();expect(tour.open).toBe(true);advanceTour(1);const index=tour.index;pauseTour();autoTour();expect(tour.open).toBe(false);startTour();expect(tour.index).toBe(index)})
it('completion is saved per user and Help can relaunch it',()=>{startTour();for(let i=0,n=tour.steps.length;i<n;i++)advanceTour(1);expect(tour.open).toBe(false);autoTour();expect(tour.open).toBe(false);startTour(true);expect(tour.index).toBe(0);pauseTour();localStorage.setItem('user',JSON.stringify({id:2}));autoTour();expect(tour.open).toBe(true)})
it('cashiers only tour tools their account can open',()=>{localStorage.setItem('role','cashier');startTour(true);expect(tour.steps.some(s=>s.path==='/pos')).toBe(true);expect(tour.steps.some(s=>s.path==='/finances')).toBe(false);expect(tour.steps.some(s=>s.path==='/inventory')).toBe(false)})
