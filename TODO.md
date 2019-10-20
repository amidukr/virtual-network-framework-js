# In Progress
1. Review LOG.warn and LOG.error
    1. web socket broken format error should be just warn, not error.
    2. Error should be only of library used it in wrong way, internal error should be just warnings

# Todo List

1. For timer and promise wrap exception into try/catch to run integration tests smoothly
1. Replace boilerplate code with commonly used JS libraries 
1. Implement stress test
1. Remove/Extract VNF System
1. Share specification document
   1. algin application according to spec
        1. rename packages and namings to Neuron-Vnf
        1. rename vip to eva
        1. rename big message to name according to specification document
        1. Rename store to registry - Update specification and update code (store persistent thing) 


# On-Hold
1. Migrate to Jasmine test framework 

# Done
1. Split src and test
1. Run RTC as Unit
1. Fixed: RTC openConnection do not retry if parent openConnection failed
1. review redundant test related configurations on html page and exract config set  launcher to config.js file
1. review and remove obsolete code
1. review vnfTest it executes same test multiple times.
1. run tests in firefox and IE.
1. try rtc over websocket hub
1. disable rtc tests
1. should be no failing tests
1. clean-up todos
1. Fix/Run flaky integration test
1. Refactor Unit Test
1. Migrate integration test to new stack
1. Remove TestConfig
