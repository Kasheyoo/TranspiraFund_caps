// src/services/LocalAiService.js

const KNOWLEDGE_BASE = {
  INFRASTRUCTURE: {
    default: [ "Mobilization & Site Clearing", "Material Delivery", "Structural Framework", "Finishing", "Turnover" ],
    road: [ "Traffic Mgmt Setup", "Demolition & Clearing", "Sub-grade Prep", "Concrete Pouring", "Curing & Marking", "Final Inspection" ],
    drainage: [ "Safety Barricades", "Excavation", "Pipe Installation", "Manhole Construction", "Backfilling", "Surface Restoration" ]
  },
  UTILITY: {
    default: [ "Site Survey", "Equipment Procurement", "Installation", "Testing & Commissioning" ],
    solar: [ "Site Assessment", "Panel Delivery", "Mounting Structure", "PV Panel Wiring", "System Power Up" ]
  }
};

const parseTargetDate = (dateStr) => {
  if (!dateStr || dateStr === 'TBD') return null;
  const currentYear = new Date().getFullYear();
  const date = new Date(`${dateStr} ${currentYear}`);
  if (isNaN(date.getTime())) return null;
  if (date < new Date()) date.setFullYear(currentYear + 1);
  return date;
};

export const generateMilestonesLocal = async (title, category, targetDateStr) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cleanTitle = title ? title.toLowerCase() : "";
      const cleanCat = category ? category.toUpperCase() : "INFRASTRUCTURE";

      // 1. Select the Best Template
      let templateTitles = [];
      if (KNOWLEDGE_BASE[cleanCat]) {
        const group = KNOWLEDGE_BASE[cleanCat];
        if (cleanTitle.includes("road") || cleanTitle.includes("widening") || cleanTitle.includes("highway")) {
          templateTitles = group.road || group.default;
        } else if (cleanTitle.includes("drain") || cleanTitle.includes("canal") || cleanTitle.includes("sewer")) {
          templateTitles = group.drainage || group.default;
        } else if (cleanTitle.includes("solar") || cleanTitle.includes("light") || cleanTitle.includes("lamp")) {
          templateTitles = KNOWLEDGE_BASE.UTILITY.solar || group.default;
        } else {
          templateTitles = group.default;
        }
      } else {
        templateTitles = KNOWLEDGE_BASE.INFRASTRUCTURE.default;
      }

      // 2. Calculate Dates (Divide Duration Logic)
      const startDate = new Date();
      const endDate = parseTargetDate(targetDateStr);
      let stepDays = 7; // Default 1 week per phase if no date

      if (endDate) {
        const diffTime = Math.abs(endDate - startDate);
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Divide total days by number of milestones
        stepDays = Math.floor(totalDays / templateTitles.length);
      }

      // 3. Construct the Milestones
      const generated = templateTitles.map((title, index) => {
        const mDate = new Date(startDate);
        // Distribute dates evenly: Today + (Step * MilestoneNumber)
        mDate.setDate(startDate.getDate() + (stepDays * (index + 1)));

        const formattedDate = mDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          title: title,
          targetDate: formattedDate,
          status: 'Pending',
          proofImage: null,
          location: null
        };
      });

      resolve(generated);
    }, 1500); // Fake "Thinking" delay
  });
};