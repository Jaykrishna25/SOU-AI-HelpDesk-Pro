const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const rows = [
  ["CR-A101","Classroom A-101","CLASSROOM",60,"A Block","1",72,58,3.2],
  ["CR-A102","Classroom A-102","CLASSROOM",60,"A Block","1",70,58,3.2],
  ["CR-B201","Classroom B-201","CLASSROOM",90,"B Block","2",64,84,4.6],
  ["CR-B305","Smart Classroom B-305","CLASSROOM",45,"B Block","3",88,46,2.4],
  ["LAB-CS1","Computer Lab CS-1","LAB",40,"C Block","1",58,72,7.8],
  ["LAB-CS2","Computer Lab CS-2","LAB",40,"C Block","1",58,72,7.8],
  ["LAB-AI1","AI and ML Lab","LAB",30,"C Block","2",76,54,6.1],
  ["LAB-ELX","Electronics Lab","LAB",35,"D Block","1",52,66,8.4],
  ["LIB-RR1","Library Reading Room 1","LIBRARY_SEAT",120,"Library","1",84,180,5.2],
  ["LIB-RR2","Library Reading Room 2","LIBRARY_SEAT",120,"Library","2",84,180,5.2],
  ["LIB-SIL","Silent Study Zone","LIBRARY_SEAT",60,"Library","2",90,96,2.8],
  ["LIB-GRP","Group Discussion Pods","LIBRARY_SEAT",24,"Library","1",78,42,1.6],
  ["SPT-CRK","Cricket Ground","SPORTS",30,"Sports Complex",null,96,4200,0.8],
  ["SPT-BKT","Basketball Court","SPORTS",20,"Sports Complex",null,94,620,1.2],
  ["SPT-BDM","Badminton Court 1","SPORTS",8,"Indoor Hall","G",82,84,2.4],
  ["SPT-GYM","Fitness Centre","SPORTS",25,"Indoor Hall","1",62,180,6.5],
  ["PRK-S01","Student Parking Zone A","PARKING",150,"Gate 1",null,70,2800,0.4],
  ["PRK-S02","Student Parking Zone B","PARKING",120,"Gate 2",null,70,2400,0.4],
  ["PRK-F01","Faculty Parking","PARKING",60,"Admin Block",null,74,1200,0.4],
  ["PRK-EV1","EV Charging Bays","PARKING",12,"Gate 1",null,98,240,11.0],
  ["AUD-MAIN","Main Auditorium","AUDITORIUM",600,"Auditorium","G",56,720,22.0],
  ["AUD-SEM1","Seminar Hall 1","AUDITORIUM",150,"A Block","4",68,220,8.5],
  ["AUD-SEM2","Seminar Hall 2","AUDITORIUM",100,"B Block","4",70,160,6.5],
  ["EQP-PRJ","Portable Projector Kit","EQUIPMENT",1,"Store","G",66,0,0.3],
  ["EQP-CAM","DSLR and Tripod Kit","EQUIPMENT",1,"Media Room","1",80,0,0.1],
  ["EQP-DRN","Survey Drone","EQUIPMENT",1,"Media Room","1",80,0,0.2],
];

async function main() {
  for (const r of rows) {
    await db.resource.upsert({
      where: { code: r[0] },
      update: {},
      create: {
        code: r[0], name: r[1], type: r[2], capacity: r[3],
        building: r[4], floor: r[5], ecoScore: r[6],
        areaSqm: r[7], powerKw: r[8],
        location: r[4] + (r[5] ? " / Floor " + r[5] : ""),
      },
    });
  }
  console.log("Seeded " + rows.length + " resources");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
