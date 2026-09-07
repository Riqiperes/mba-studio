export type AcademyGroupSchedule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type AcademyGroupCatalogItem = {
  id: string;
  name: string;
  instructorName: string | null;
  ageMin: number | null;
  ageMax: number | null;
  schedules: AcademyGroupSchedule[];
};
