import { state } from './state.js?v=3.3.0';
import { resetCalendarToToday } from './ui/matches.js?v=3.3.0';

// Register callbacks in state to prevent circular dependencies during initialization
state.resetCalendarToTodayRef = resetCalendarToToday;

// Re-export all functions from modular sub-files
export { renderDashboardMetrics, renderMontepremi } from './ui/dashboard.js?v=3.3.0';
export { 
  renderLeaderboard, 
  filterLeaderboard, 
  navigateToUserPredictions, 
  navigateToUserTabellone, 
  setLeaderboardSort 
} from './ui/leaderboard.js?v=3.3.0';
export { 
  renderMatches, 
  openMatchModal, 
  getDefaultDate, 
  resetCalendarToToday, 
  initCalendar 
} from './ui/matches.js?v=3.3.0';
export { populateUserSelector, renderUserPredictions } from './ui/predictions.js?v=3.3.0';
export { renderHome } from './ui/home.js?v=3.3.0';
export { renderGlobalStats } from './ui/stats.js?v=3.3.0';
export { 
  initFaseFinale, 
  resolveTeam, 
  getWinnerLoser, 
  renderTabellone, 
  drawBracketLines, 
  selectBracketPlayer 
} from './ui/bracket.js?v=3.3.0';
