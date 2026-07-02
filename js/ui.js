import { state } from './state.js';
import { resetCalendarToToday } from './ui/matches.js';

// Register callbacks in state to prevent circular dependencies during initialization
state.resetCalendarToTodayRef = resetCalendarToToday;

// Re-export all functions from modular sub-files
export { renderDashboardMetrics, renderMontepremi } from './ui/dashboard.js';
export { 
  renderLeaderboard, 
  filterLeaderboard, 
  navigateToUserPredictions, 
  navigateToUserTabellone, 
  setLeaderboardSort 
} from './ui/leaderboard.js';
export { 
  renderMatches, 
  openMatchModal, 
  getDefaultDate, 
  resetCalendarToToday, 
  initCalendar 
} from './ui/matches.js';
export { populateUserSelector, renderUserPredictions } from './ui/predictions.js';
export { renderHome } from './ui/home.js';
export { renderGlobalStats } from './ui/stats.js';
export { 
  initFaseFinale, 
  resolveTeam, 
  getWinnerLoser, 
  renderTabellone, 
  drawBracketLines, 
  selectBracketPlayer 
} from './ui/bracket.js';
