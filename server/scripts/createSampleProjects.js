import { db } from '../db.js';
import { projects } from '../../shared/schema.js';

async function createSampleProjects() {
  const sampleProjects = [
    {
      name: 'Downtown Office Complex',
      description: 'Major asbestos and lead abatement project for 20-story office building renovation',
      clientName: 'Metropolitan Development Corp',
      clientContact: 'sarah.johnson@metrodev.com',
      budget: 450000,
      status: 'active'
    },
    {
      name: 'Warehouse Remediation',
      description: 'Environmental cleanup and hazmat removal for industrial warehouse conversion',
      clientName: 'GreenSpace Industries',
      clientContact: 'mike.chen@greenspace.com',
      budget: 280000,
      status: 'active'
    },
    {
      name: 'School Modernization',
      description: 'Lead paint abatement and asbestos removal for elementary school renovation',
      clientName: 'City School District',
      clientContact: 'lisa.martinez@cityschools.edu',
      budget: 325000,
      status: 'on-hold'
    }
  ];

  try {
    for (const project of sampleProjects) {
      await db.insert(projects).values(project);
    }
    console.log('Sample projects created successfully!');
    console.log(`Created ${sampleProjects.length} projects:`);
    sampleProjects.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.clientName}) - $${p.budget.toLocaleString()}`);
    });
  } catch (error) {
    console.error('Error creating sample projects:', error);
  }
}

createSampleProjects().catch(console.error);