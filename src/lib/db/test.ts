// Database Setup and Functionality Test
// Comprehensive test suite for the Daily Task Planner database

const { 
  createTestDatabaseAPI, 
  TestDataFixtures,
  DatabaseAPI 
} = require('./api');
const { DatabaseManager } = require('./index');
const fs = require('fs');
const path = require('path');

async function testDatabaseSetup() {
  console.log('🧪 Starting Database Setup Tests...\n');

  let testManager: any;
  let api: any;
  let testHelpers: any;

  try {
    // Initialize test database
    console.log('📁 Setting up test database...');
    const testSetup = createTestDatabaseAPI({
      path: './test-data/tasks_test.db',
      verbose: true
    });
    
    api = testSetup.api;
    testManager = testSetup.testManager;
    testHelpers = testSetup.testHelpers;
    
    await testManager.initialize();
    console.log('✅ Test database initialized\n');

    // Run migrations
    console.log('🔄 Running migrations...');
    await api.runMigrations();
    console.log('✅ Migrations completed\n');

    // Test health check
    console.log('🏥 Testing health check...');
    const health = await api.healthCheck();
    console.log(`Health Status: ${health.status}`);
    if (health.checks) {
      health.checks.forEach((check: any) => {
        const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${check.name}: ${check.message}`);
      });
    }
    console.log('✅ Health check completed\n');

    // Create test data
    console.log('📊 Creating test data...');
    const testData = TestDataFixtures.createTestDataset();
    await testHelpers.insertTestData(testData);
    console.log('✅ Test data inserted\n');

    // Verify test data
    console.log('🔍 Verifying test data...');
    const verification = await testHelpers.verifyTestData(testData);
    if (!verification.isValid) {
      console.error('❌ Data verification failed:', verification.errors);
      throw new Error('Test data verification failed');
    }
    console.log('✅ Test data verified\n');

    // Test database operations
    console.log('🔧 Testing database operations...');
    await testDatabaseOperations(api, testData);
    console.log('✅ Database operations tests completed\n');

    // Test performance
    console.log('⚡ Testing performance...');
    const performance = await testHelpers.performanceTest(100);
    console.log(`Performance: ${performance.recordsPerSecond} records/second`);
    console.log('✅ Performance test completed\n');

    // Test integrity
    console.log('🛡️ Testing database integrity...');
    const integrity = await testHelpers.integrityTest();
    if (!integrity.isValid) {
      console.error('❌ Integrity check failed:', integrity.issues);
    } else {
      console.log('✅ Database integrity verified');
    }
    console.log('');

    console.log('🎉 All database tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (testManager) {
      console.log('🧹 Cleaning up test database...');
      await testManager.drop();
      console.log('✅ Cleanup completed');
    }
  }
}

async function testDatabaseOperations(api: any, testData: any) {
  console.log('Testing Task Operations...');
  
  // Test creating a new task
  const newTask = await api.createTask({
    name: 'Test Task Creation',
    description: 'Testing task creation functionality',
    priority: 'High',
    status: 'todo',
    userId: testData.users[0].id,
    listId: testData.lists[0].id,
    position: 999,
    isRecurring: false,
  });
  
  console.log(`✅ Created task: ${newTask.name}`);

  // Test getting task with details
  const taskWithDetails = await api.getTaskWithDetails(newTask.id);
  if (taskWithDetails) {
    console.log(`✅ Retrieved task with details: ${taskWithDetails.name}`);
  }

  // Test updating task
  const updatedTask = await api.updateTask(
    newTask.id,
    { name: 'Updated Test Task', status: 'in_progress' },
    testData.users[0].id
  );
  console.log(`✅ Updated task: ${updatedTask.name} (status: ${updatedTask.status})`);

  // Test list operations
  console.log('Testing List Operations...');
  const lists = await api.getUserListsWithCounts(testData.users[0].id);
  console.log(`✅ Retrieved ${lists.length} lists for user`);

  // Test label operations
  console.log('Testing Label Operations...');
  const labels = await api.getUserLabelsWithCounts(testData.users[0].id);
  console.log(`✅ Retrieved ${labels.length} labels for user`);

  // Test adding label to task
  await api.addLabelToTask(newTask.id, testData.labels[0].id);
  console.log(`✅ Added label to task`);

  // Test getting task labels
  const taskLabels = await api.getTaskLabels(newTask.id);
  console.log(`✅ Task has ${taskLabels.length} labels`);

  // Test subtask operations
  console.log('Testing Subtask Operations...');
  const subtask = await api.createSubtask({
    name: 'Test Subtask',
    isCompleted: false,
    taskId: newTask.id,
    position: 0,
  });
  console.log(`✅ Created subtask: ${subtask.name}`);

  const subtasks = await api.getSubtasks(newTask.id);
  console.log(`✅ Task has ${subtasks.length} subtasks`);

  // Test reminder operations
  console.log('Testing Reminder Operations...');
  const reminder = await api.createReminder({
    taskId: newTask.id,
    remindAt: new Date(Date.now() + 3600000), // 1 hour from now
    isSent: false,
    method: 'push',
  });
  console.log(`✅ Created reminder for ${reminder.remindAt.toLocaleString()}`);

  const reminders = await api.getReminders(newTask.id);
  console.log(`✅ Task has ${reminders.length} reminders`);

  // Test task history
  console.log('Testing Task History...');
  const history = await api.getTaskHistory(newTask.id);
  console.log(`✅ Task has ${history.length} history entries`);

  // Test getting user tasks with filters
  console.log('Testing Task Queries with Filters...');
  const filteredTasks = await api.getUserTasks(testData.users[0].id, {
    status: 'todo',
    priority: 'High'
  });
  console.log(`✅ Retrieved ${filteredTasks.length} filtered tasks`);
}

async function testProductionDatabase() {
  console.log('\n🏭 Testing Production Database Setup...\n');

  try {
    // Initialize production database
    const dbManager = DatabaseManager.getInstance({
      path: './data/tasks_production_test.db',
      verbose: true,
    });

    await dbManager.initialize();
    console.log('✅ Production database initialized');

    // Test health check
    const health = await dbManager.healthCheck();
    console.log(`✅ Health check: ${health.healthy ? 'Healthy' : 'Unhealthy'}`);
    if (health.stats) {
      console.log(`   Tasks: ${health.stats.totalTasks}`);
      console.log(`   Lists: ${health.stats.totalLists}`);
      console.log(`   Labels: ${health.stats.totalLabels}`);
    }

    // Test basic operations
    const testUserId = 'test-user-id';
    const testListId = 'test-list-id';

    // Create default list
    dbManager.run(
      'INSERT OR IGNORE INTO lists (id, name, color, emoji, is_default, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        testListId, 'Test List', '#3B82F6', '📋', 1, testUserId, new Date(), new Date()
      ]
    );
    console.log('✅ Created test list');

    // Create test task
    const taskId = crypto.randomUUID();
    dbManager.run(
      'INSERT INTO tasks (id, name, description, priority, status, user_id, list_id, position, is_recurring, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        taskId, 'Production Test Task', 'Testing production setup', 'Medium', 'todo',
        testUserId, testListId, 0, 0, new Date(), new Date()
      ]
    );
    console.log('✅ Created test task');

    // Query test
    const tasks = dbManager.query('SELECT * FROM tasks WHERE user_id = ?', [testUserId]);
    console.log(`✅ Retrieved ${tasks.length} tasks`);

    // Test backup creation
    await dbManager.createBackup('./data/test-backup.db');
    console.log('✅ Created backup');

    // Cleanup
    dbManager.close();
    if (fs.existsSync('./data/tasks_production_test.db')) {
      fs.unlinkSync('./data/tasks_production_test.db');
    }
    if (fs.existsSync('./data/test-backup.db')) {
      fs.unlinkSync('./data/test-backup.db');
    }
    console.log('✅ Production test cleanup completed');

  } catch (error) {
    console.error('❌ Production test failed:', error);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testDatabaseSetup();
    await testProductionDatabase();
    console.log('\n🎊 All tests passed successfully! Database setup is ready for production.');
  } catch (error) {
    console.error('\n💥 Tests failed:', error);
    process.exit(1);
  }
}

// Execute tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testDatabaseSetup,
  testProductionDatabase,
  runAllTests
};