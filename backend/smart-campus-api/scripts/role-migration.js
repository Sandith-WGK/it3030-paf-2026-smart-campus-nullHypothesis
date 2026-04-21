// MongoDB migration script for role expansion.
// Usage (mongosh):
//   use <database_name>
//   load("scripts/role-migration.js")

const users = db.getCollection("users");

const mapping = {
  ADMIN: "MANAGER",
  USER: "UNDERGRADUATE_STUDENT",
  TECHNICIAN: "TECHNICIAN",
};

let updated = 0;
Object.entries(mapping).forEach(([from, to]) => {
  const result = users.updateMany({ role: from }, { $set: { role: to } });
  updated += result.modifiedCount || 0;
  print(`[role-migration] ${from} -> ${to}: ${result.modifiedCount || 0} updated`);
});

const managerCount = users.countDocuments({ role: "MANAGER" });
print(`[role-migration] total updated: ${updated}`);
print(`[role-migration] managers after migration: ${managerCount}`);
if (managerCount === 0) {
  print("[role-migration][WARNING] No MANAGER users found after migration.");
}
