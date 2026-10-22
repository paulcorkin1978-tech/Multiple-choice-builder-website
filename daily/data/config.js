/* Teacher settings — edit this one block.
   coveredThrough: the last sub-topic taught so far for each course (topic id).
   Students are served questions from topics up to and including it, unless they tick
   "include topics not yet covered". Leave a course out to treat everything as covered. */
window.T2E = window.T2E || {};
T2E.config = {
  defaultCourse: 'y11',
  coveredThrough: {
    // y11: 'y11.markets.ped',
  }
};
