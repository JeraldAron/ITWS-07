import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';

export type ActivityStatus = 'Pending' | 'Ongoing' | 'Completed' | 'Cancelled';
export type Priority = 'Urgent' | 'High' | 'Normal' | 'Low';

export interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  deadline: string;
  category: string;
  status: ActivityStatus;
  priority?: Priority;
  assignee: string;
  reminder: boolean;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
  active: boolean;
  initials: string;
  color: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  activeView = 'Overview';
  searchQuery = '';
  statusFilter = 'All statuses';
  categoryFilter = 'All categories';
  priorityFilter = 'All priorities';
  activityFilterTab: 'all' | 'my' | 'today' | 'upcoming' | 'overdue' | 'completed' = 'all';
  activitiesLayout: 'list' | 'kanban' = 'list';
  sortBy: 'date-asc' | 'date-desc' | 'priority' | 'title' = 'date-asc';

  isDarkMode = false;
  mobileSidebarOpen = false;
  showActivityModal = false;
  showMemberModal = false;
  showDeleteConfirm = false;
  showNotifications = false;
  showSearchDropdown = false;
  editingId: number | null = null;
  activityToDelete: Activity | null = null;
  lastDeletedActivity: Activity | null = null;
  toastMessage = '';
  toastUndoable = false;
  weekOffset = 0;
  memberSearchQuery = '';

  activityForm: Omit<Activity, 'id'> = this.emptyForm();
  memberForm = { name: '', email: '', role: 'Member' as 'Admin' | 'Member', color: 'blue' };

  readonly navItems = [
    { label: 'Overview', icon: 'grid-outline' },
    { label: 'Activities', icon: 'checkbox-outline' },
    { label: 'Calendar', icon: 'calendar-outline' },
    { label: 'Team', icon: 'people-outline' },
    { label: 'Reports', icon: 'bar-chart-outline' },
  ];

  readonly categories = ['Planning', 'Design', 'Development', 'Marketing', 'Meeting', 'Personal'];
  readonly statuses: ActivityStatus[] = ['Pending', 'Ongoing', 'Completed', 'Cancelled'];
  readonly priorities: Priority[] = ['Urgent', 'High', 'Normal', 'Low'];
  readonly memberColors = ['blue', 'peach', 'green', 'lavender', 'purple', 'teal'];
  readonly reportPeriods = ['All time', 'Last 7 days', 'Last 30 days'];
  reportPeriod = 'All time';
  reportStatusFilter = 'All statuses';
  reportCategoryFilter = 'All categories';

  activities: Activity[] = this.load('activity-tracker-items', this.seedActivities());
  members: TeamMember[] = this.load('activity-tracker-members', [
    { id: 1, name: 'Alex Morgan', email: 'alex.morgan@company.com', role: 'Admin', active: true, initials: 'AM', color: 'blue' },
    { id: 2, name: 'Jordan Lee', email: 'jordan.lee@company.com', role: 'Member', active: true, initials: 'JL', color: 'peach' },
    { id: 3, name: 'Taylor Kim', email: 'taylor.kim@company.com', role: 'Member', active: true, initials: 'TK', color: 'green' },
    { id: 4, name: 'Sam Rivera', email: 'sam.rivera@company.com', role: 'Member', active: false, initials: 'SR', color: 'lavender' },
  ]);

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('dayflow-theme');
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    } else {
      this.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusSearch();
    } else if (event.key === 'Escape') {
      this.showActivityModal = false;
      this.showMemberModal = false;
      this.showDeleteConfirm = false;
      this.showNotifications = false;
      this.showSearchDropdown = false;
      this.mobileSidebarOpen = false;
    }
  }

  focusSearch(): void {
    if (this.searchInputElement) {
      this.searchInputElement.nativeElement.focus();
      this.searchInputElement.nativeElement.select();
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('dayflow-theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
    this.notify(this.isDarkMode ? 'Dark mode enabled' : 'Light mode enabled');
  }

  private applyTheme(): void {
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private save(): void {
    try {
      localStorage.setItem('activity-tracker-items', JSON.stringify(this.activities));
      localStorage.setItem('activity-tracker-members', JSON.stringify(this.members));
    } catch {
      /* Storage may be unavailable in private mode. */
    }
  }

  private localDay(offset = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return this.dateKey(d);
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private seedActivities(): Activity[] {
    const day = (offset: number) => this.localDay(offset);
    return [
      { id: 1, title: 'Weekly team standup', description: 'Share updates and align on team priorities for this week.', date: day(0), time: '09:30', deadline: day(0), category: 'Meeting', status: 'Completed', priority: 'Normal', assignee: 'Alex Morgan', reminder: true },
      { id: 2, title: 'Finalize Q4 campaign brief', description: 'Review creative direction and send the campaign brief for approval.', date: day(0), time: '11:00', deadline: day(0), category: 'Marketing', status: 'Ongoing', priority: 'High', assignee: 'Jordan Lee', reminder: true },
      { id: 3, title: 'Product design review', description: 'Walk through the latest dashboard mockups with the product team.', date: day(0), time: '14:30', deadline: day(1), category: 'Design', status: 'Ongoing', priority: 'Normal', assignee: 'Taylor Kim', reminder: true },
      { id: 4, title: 'Update project documentation', description: 'Capture the release notes and update the onboarding guide.', date: day(1), time: '10:00', deadline: day(2), category: 'Development', status: 'Pending', priority: 'Low', assignee: 'Sam Rivera', reminder: true },
      { id: 5, title: 'Customer feedback synthesis', description: 'Summarize interview findings and highlight recurring themes.', date: day(2), time: '13:00', deadline: day(4), category: 'Planning', status: 'Pending', priority: 'Normal', assignee: 'Alex Morgan', reminder: false },
      { id: 6, title: 'Homepage wireframes', description: 'Prepare the first pass of the new landing page wireframes.', date: day(3), time: '15:30', deadline: day(5), category: 'Design', status: 'Pending', priority: 'Normal', assignee: 'Taylor Kim', reminder: true },
      { id: 7, title: 'Sprint planning', description: 'Select upcoming work and agree on the sprint goal.', date: day(-3), time: '10:00', deadline: day(-2), category: 'Planning', status: 'Completed', priority: 'Normal', assignee: 'Alex Morgan', reminder: false },
      { id: 8, title: 'API integration check', description: 'Confirm the data contract with the engineering team.', date: day(-1), time: '16:00', deadline: day(0), category: 'Development', status: 'Pending', priority: 'Urgent', assignee: 'Jordan Lee', reminder: true },
    ];
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get todayLabel(): string {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  }

  get firstName(): string { return 'Alex'; }
  get activeMembers(): number { return this.members.filter(member => member.active).length; }
  get activeMembersList(): TeamMember[] { return this.members.filter(member => member.active); }

  get filteredMembers(): TeamMember[] {
    const q = this.memberSearchQuery.trim().toLowerCase();
    if (!q) return this.members;
    return this.members.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q));
  }

  get completionBars(): { label: string; percent: number; count: number }[] {
    return this.categories
      .filter(category => this.activities.some(item => item.category === category))
      .map(category => {
        const items = this.activities.filter(item => item.category === category);
        const done = items.filter(item => item.status === 'Completed').length;
        return {
          label: category,
          count: done,
          percent: Math.round((done / items.length) * 100)
        };
      })
      .slice(0, 5);
  }

  get reportActivities(): Activity[] {
    const startDate = this.reportPeriod === 'Last 7 days' ? this.localDay(-6) : this.reportPeriod === 'Last 30 days' ? this.localDay(-29) : '';
    const endDate = startDate ? this.localDay() : '';
    return this.activities.filter(item =>
      (!startDate || item.date >= startDate) &&
      (!endDate || item.date <= endDate) &&
      (this.reportStatusFilter === 'All statuses' || item.status === this.reportStatusFilter) &&
      (this.reportCategoryFilter === 'All categories' || item.category === this.reportCategoryFilter)
    );
  }

  get reportCompletedCount(): number { return this.reportActivities.filter(item => item.status === 'Completed').length; }
  get reportCompletionRate(): number { return this.reportActivities.length ? Math.round((this.reportCompletedCount / this.reportActivities.length) * 100) : 0; }
  get reportInProgressCount(): number { return this.reportActivities.filter(item => item.status === 'Ongoing').length; }
  get reportOverdueCount(): number { return this.reportActivities.filter(item => item.status !== 'Completed' && item.status !== 'Cancelled' && item.deadline < this.localDay()).length; }
  get reportCategoryCount(): number { return new Set(this.reportActivities.map(item => item.category)).size; }

  get reportCompletionBars(): { label: string; percent: number; count: number; total: number }[] {
    return this.categories
      .filter(category => this.reportActivities.some(item => item.category === category))
      .map(category => {
        const items = this.reportActivities.filter(item => item.category === category);
        const count = items.filter(item => item.status === 'Completed').length;
        return { label: category, count, total: items.length, percent: Math.round((count / items.length) * 100) };
      });
  }

  get reportMemberLeaderboard(): { member: TeamMember; total: number; completed: number; inProgress: number; rate: number }[] {
    return this.members.map(member => {
      const memberActivities = this.activities.filter(a => a.assignee === member.name);
      const total = memberActivities.length;
      const completed = memberActivities.filter(a => a.status === 'Completed').length;
      const inProgress = memberActivities.filter(a => a.status === 'Ongoing').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { member, total, completed, inProgress, rate };
    }).sort((a, b) => b.completed - a.completed);
  }

  get completedCount(): number { return this.activities.filter(item => item.status === 'Completed').length; }
  get completionRate(): number { return this.activities.length ? Math.round((this.completedCount / this.activities.length) * 100) : 0; }
  get inProgressCount(): number { return this.activities.filter(item => item.status === 'Ongoing').length; }
  get upcomingCount(): number { return this.activities.filter(item => item.status !== 'Completed' && item.status !== 'Cancelled' && item.date >= this.localDay()).length; }
  get overdueCount(): number { return this.activities.filter(item => item.status !== 'Completed' && item.status !== 'Cancelled' && item.deadline < this.localDay()).length; }

  get searchDropdownResults(): Activity[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return [];
    return this.activities
      .filter(item => `${item.title} ${item.description} ${item.assignee} ${item.category}`.toLowerCase().includes(q))
      .slice(0, 5);
  }

  get visibleActivities(): Activity[] {
    const query = this.searchQuery.trim().toLowerCase();
    const today = this.localDay();

    return this.activities
      .filter(item => {
        // Search filter
        if (query && !`${item.title} ${item.description} ${item.assignee} ${item.category}`.toLowerCase().includes(query)) {
          return false;
        }
        // Dropdown status filter
        if (this.statusFilter !== 'All statuses' && item.status !== this.statusFilter) {
          return false;
        }
        // Dropdown category filter
        if (this.categoryFilter !== 'All categories' && item.category !== this.categoryFilter) {
          return false;
        }
        // Dropdown priority filter
        if (this.priorityFilter !== 'All priorities' && (item.priority || 'Normal') !== this.priorityFilter) {
          return false;
        }
        // Tab filter
        switch (this.activityFilterTab) {
          case 'my':
            return item.assignee === this.firstName || item.assignee.startsWith(this.firstName + ' ');
          case 'today':
            return item.date === today;
          case 'upcoming':
            return item.status !== 'Completed' && item.status !== 'Cancelled' && item.date >= today;
          case 'overdue':
            return item.status !== 'Completed' && item.status !== 'Cancelled' && item.deadline < today;
          case 'completed':
            return item.status === 'Completed';
          default:
            return true;
        }
      })
      .sort((a, b) => {
        if (this.sortBy === 'date-asc') {
          return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
        } else if (this.sortBy === 'date-desc') {
          return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`);
        } else if (this.sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else if (this.sortBy === 'priority') {
          const rank: Record<Priority, number> = { Urgent: 4, High: 3, Normal: 2, Low: 1 };
          return (rank[b.priority || 'Normal'] || 0) - (rank[a.priority || 'Normal'] || 0);
        }
        return 0;
      });
  }

  get todayActivities(): Activity[] {
    return this.activities.filter(item => item.date === this.localDay()).sort((a, b) => a.time.localeCompare(b.time));
  }

  get assignedActivities(): Activity[] {
    return this.activities
      .filter(item => item.assignee === this.firstName || item.assignee.startsWith(this.firstName + ' '))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  get notifications(): Activity[] {
    return this.activities
      .filter(item => item.reminder && item.status !== 'Completed' && item.status !== 'Cancelled')
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 6);
  }

  get weekDays(): { date: Date; key: string; label: string; day: string; items: Activity[] }[] {
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekday = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - weekday + this.weekOffset * 7);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = this.dateKey(date);
      return {
        date,
        key,
        label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
        day: String(date.getDate()),
        items: this.activities.filter(item => item.date === key).sort((a, b) => a.time.localeCompare(b.time))
      };
    });
  }

  get todayKey(): string { return this.localDay(); }

  activitiesOnDate(key: string): Activity[] {
    return this.activities.filter(item => item.date === key).sort((a, b) => a.time.localeCompare(b.time));
  }

  activitiesForMember(name: string): Activity[] {
    return this.activities.filter(item => item.assignee === name);
  }

  activitiesForCategory(category: string): Activity[] {
    return this.activities.filter(item => item.category === category);
  }

  getKanbanActivities(status: ActivityStatus): Activity[] {
    return this.visibleActivities.filter(item => item.status === status);
  }

  get weekLabel(): string {
    const days = this.weekDays;
    const start = days[0].date;
    const end = days[6].date;
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' });
    return start.getMonth() === end.getMonth()
      ? `${month.format(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
      : `${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(start)} ${start.getDate()} – ${month.format(end)} ${end.getDate()}, ${end.getFullYear()}`;
  }

  get calendarActivityCount(): number {
    return this.activities.filter(item => {
      const start = this.weekDays[0].key;
      const end = this.weekDays[6].key;
      return item.date >= start && item.date <= end;
    }).length;
  }

  countStatus(status: ActivityStatus): number {
    return this.activities.filter(item => item.status === status).length;
  }

  countReportStatus(status: ActivityStatus): number {
    return this.reportActivities.filter(item => item.status === status).length;
  }

  downloadReport(): void {
    const rows = [
      ['Title', 'Description', 'Date', 'Time', 'Deadline', 'Category', 'Priority', 'Status', 'Assignee'],
      ...this.reportActivities.map(item => [
        item.title,
        item.description,
        item.date,
        item.time,
        item.deadline,
        item.category,
        item.priority || 'Normal',
        item.status,
        item.assignee
      ]),
    ];
    const csv = rows.map(row => row.map(value => `"${(value || '').toString().replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dayflow-activity-report-${this.localDay()}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    this.notify('Report exported to CSV');
  }

  printReport(): void {
    window.print();
  }

  initials(name: string): string {
    return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }

  avatarColor(name: string): string {
    const member = this.members.find(item => item.name === name);
    return member?.color ?? 'blue';
  }

  shortDate(date: string): string {
    if (!date) return '';
    const value = new Date(`${date}T12:00:00`);
    return this.dateKey(value) === this.localDay()
      ? 'Today'
      : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value);
  }

  dueLabel(date: string): string {
    if (!date) return '';
    const delta = Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${this.localDay()}T12:00:00`).getTime()) / 86400000);
    return delta < 0
      ? `${Math.abs(delta)}d overdue`
      : delta === 0
      ? 'Due today'
      : delta === 1
      ? 'Due tomorrow'
      : `Due ${this.shortDate(date)}`;
  }

  isOverdue(item: Activity): boolean {
    return item.status !== 'Completed' && item.status !== 'Cancelled' && item.deadline < this.localDay();
  }

  setView(view: string): void {
    this.activeView = view;
    this.showNotifications = false;
    this.showSearchDropdown = false;
    this.mobileSidebarOpen = false;
  }

  navigateToModule(moduleName: string): void {
    switch (moduleName) {
      case 'User Management':
        this.setView('Team');
        break;
      case 'Activity Management':
        this.setView('Activities');
        this.activityFilterTab = 'all';
        break;
      case 'Activity Scheduling':
        this.setView('Calendar');
        break;
      case 'Monitoring & Tracking':
        this.setView('Activities');
        this.activityFilterTab = 'all';
        this.statusFilter = 'Ongoing';
        break;
      case 'Task Assignment':
        this.setView('Activities');
        this.activityFilterTab = 'my';
        break;
      case 'Reports & Analytics':
        this.setView('Reports');
        break;
      case 'Notifications & Reminders':
        this.showNotifications = true;
        break;
      default:
        this.setView('Activities');
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.showSearchDropdown = false;
  }

  selectSearchResult(activity: Activity): void {
    this.showSearchDropdown = false;
    this.openEditActivity(activity);
  }

  setDatePreset(preset: 'today' | 'tomorrow' | 'nextWeek'): void {
    const today = new Date();
    if (preset === 'today') {
      this.activityForm.date = this.dateKey(today);
      this.activityForm.deadline = this.dateKey(today);
    } else if (preset === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      this.activityForm.date = this.dateKey(tomorrow);
      this.activityForm.deadline = this.dateKey(tomorrow);
    } else if (preset === 'nextWeek') {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      this.activityForm.date = this.dateKey(nextWeek);
      this.activityForm.deadline = this.dateKey(nextWeek);
    }
  }

  openNewActivity(): void {
    this.editingId = null;
    this.activityForm = this.emptyForm();
    this.showActivityModal = true;
  }

  quickAddOnDate(dateKey: string): void {
    this.editingId = null;
    this.activityForm = this.emptyForm();
    this.activityForm.date = dateKey;
    this.activityForm.deadline = dateKey;
    this.showActivityModal = true;
  }

  openEditActivity(item: Activity): void {
    this.editingId = item.id;
    this.activityForm = {
      title: item.title,
      description: item.description,
      date: item.date,
      time: item.time,
      deadline: item.deadline,
      category: item.category,
      status: item.status,
      priority: item.priority || 'Normal',
      assignee: item.assignee,
      reminder: item.reminder
    };
    this.showActivityModal = true;
  }

  private emptyForm(): Omit<Activity, 'id'> {
    return {
      title: '',
      description: '',
      date: this.localDay(),
      time: '09:00',
      deadline: this.localDay(),
      category: 'Planning',
      status: 'Pending',
      priority: 'Normal',
      assignee: 'Alex Morgan',
      reminder: true
    };
  }

  saveActivity(): void {
    if (!this.activityForm.title.trim()) return;
    const clean = {
      ...this.activityForm,
      title: this.activityForm.title.trim(),
      description: this.activityForm.description.trim()
    };
    if (this.editingId !== null) {
      this.activities = this.activities.map(item => item.id === this.editingId ? { id: this.editingId!, ...clean } : item);
      this.notify('Activity updated successfully');
    } else {
      this.activities = [{ id: Date.now(), ...clean }, ...this.activities];
      this.notify('Activity created successfully');
    }
    this.save();
    this.showActivityModal = false;
  }

  updateStatus(item: Activity, event: Event): void {
    item.status = (event.target as HTMLSelectElement).value as ActivityStatus;
    this.save();
    this.notify(`Status changed to ${item.status}`);
  }

  advanceStatus(item: Activity): void {
    const sequence: ActivityStatus[] = ['Pending', 'Ongoing', 'Completed'];
    const currentIndex = sequence.indexOf(item.status);
    if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
      item.status = sequence[currentIndex + 1];
    } else if (item.status === 'Completed') {
      item.status = 'Pending';
    } else {
      item.status = 'Ongoing';
    }
    this.save();
    this.notify(`${item.title} moved to ${item.status}`);
  }

  toggleTask(item: Activity): void {
    item.status = item.status === 'Completed' ? 'Pending' : 'Completed';
    this.save();
    if (item.status === 'Completed') {
      this.notify(`Awesome! Completed "${item.title}" 🎉`);
    }
  }

  confirmDelete(item: Activity): void {
    this.activityToDelete = item;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.activityToDelete = null;
    this.showDeleteConfirm = false;
  }

  executeDelete(): void {
    if (!this.activityToDelete) return;
    const item = this.activityToDelete;
    this.lastDeletedActivity = item;
    this.activities = this.activities.filter(activity => activity.id !== item.id);
    this.save();
    this.showDeleteConfirm = false;
    this.activityToDelete = null;
    this.notify(`Deleted "${item.title}"`, true);
  }

  undoDelete(): void {
    if (this.lastDeletedActivity) {
      this.activities = [this.lastDeletedActivity, ...this.activities];
      this.save();
      const title = this.lastDeletedActivity.title;
      this.lastDeletedActivity = null;
      this.toastMessage = '';
      this.notify(`Restored "${title}"`);
    }
  }

  openAddMemberModal(): void {
    this.memberForm = { name: '', email: '', role: 'Member', color: this.memberColors[Math.floor(Math.random() * this.memberColors.length)] };
    this.showMemberModal = true;
  }

  saveMember(): void {
    if (!this.memberForm.name.trim() || !this.memberForm.email.trim()) return;
    const newMember: TeamMember = {
      id: Date.now(),
      name: this.memberForm.name.trim(),
      email: this.memberForm.email.trim(),
      role: this.memberForm.role,
      active: true,
      initials: this.initials(this.memberForm.name),
      color: this.memberForm.color
    };
    this.members = [...this.members, newMember];
    this.save();
    this.showMemberModal = false;
    this.notify(`Added ${newMember.name} to the team`);
  }

  deleteMember(member: TeamMember): void {
    if (member.id === 1) {
      this.notify('Cannot delete the primary workspace administrator');
      return;
    }
    this.members = this.members.filter(m => m.id !== member.id);
    this.save();
    this.notify(`Removed ${member.name}`);
  }

  toggleMember(member: TeamMember): void {
    member.active = !member.active;
    this.save();
    this.notify(`${member.name} is now ${member.active ? 'active' : 'inactive'}`);
  }

  changeRole(member: TeamMember, event: Event): void {
    member.role = (event.target as HTMLSelectElement).value as 'Admin' | 'Member';
    this.save();
    this.notify(`${member.name}'s role updated to ${member.role}`);
  }

  changeWeek(offset: number): void {
    this.weekOffset += offset;
  }

  getCategoryColor(category: string): string {
    return (
      {
        Planning: 'blue',
        Design: 'purple',
        Development: 'green',
        Marketing: 'orange',
        Meeting: 'teal',
        Personal: 'pink'
      } as Record<string, string>
    )[category] ?? 'blue';
  }

  getPriorityBadgeClass(priority: Priority | undefined): string {
    switch (priority) {
      case 'Urgent':
        return 'priority-urgent';
      case 'High':
        return 'priority-high';
      case 'Low':
        return 'priority-low';
      default:
        return 'priority-normal';
    }
  }

  dismissNotification(item: Activity): void {
    item.reminder = false;
    this.save();
  }

  markAllNotificationsRead(): void {
    this.notifications.forEach(item => (item.reminder = false));
    this.save();
    this.notify('All notifications marked as read');
  }

  notify(message: string, undoable = false): void {
    this.toastMessage = message;
    this.toastUndoable = undoable;
    window.setTimeout(() => {
      if (this.toastMessage === message) {
        this.toastMessage = '';
        this.toastUndoable = false;
      }
    }, undoable ? 4500 : 3000);
  }
}
