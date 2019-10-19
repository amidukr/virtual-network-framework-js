# In Progress
1. Refactor Unit Test
1. Fix/Run integration test

# Todo List

1. Review LOG.warn and LOG.error
    1. web socket broken format error should be just warn, not error.
    2. Error should be only of library used it in wrong way, internal error should be just warnings
1. For timer and promise wrap exception into try/catch to run integration tests smoothly
1. Replace boilerplate code with commonly used JS libraries
   1. Remove TestConfig 
1. Implement stress test
1. Remove/Extract VNF System
1. Share specification document

# Previous List

1. clean-up todos
   1. review and remove obsolete code
    1. review redundant test related configurations on html page and exract config set  launcher to config.js file
    1. review vnfTest it executes same test multiple times.
       1. vnf test is used only in one place in rtc, move that method to here.
1. run tests in firefox and IE.
1. try rtc over websocket hub
1. VNF System isn't part of VNF - needs decision here.
1. rename packages and namings to Neuron-Vnf
1. rename vip to eva
1. rename big message to name according to specification document
1. disable rtc tests
1. clean-up todos again
1. should be no failing tests

# Done
1. Split src and test
1. Run RTC as Unit