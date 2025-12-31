export class ProjectModel {
  constructor(id, title, status, category, contractor, targetDate, budget, progress, badgeType) {
    this.id = id;
    this.title = title;
    this.status = status;
    this.category = category;
    this.contractor = contractor;
    this.targetDate = targetDate;
    this.budget = budget;
    this.progress = progress;
    this.badgeType = badgeType;
  }
}