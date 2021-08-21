# In Progress


# Todo List
1. Fix, library mode shouldn't generate VNF.VNF.InBrowser
2. Timeouts.iceSendTimeout - doesn't works by default


# Future tasks/On-Hold
1. Upgrade node to 16 in travis
1. Remove/Extract VNF System
1. Reliable close connection, only one message send, no retries to resend cancel connection.
1. Migrate to Jasmine test framework 
1. Use sinon.js for mocking instead of custom
   1. mock timer
1. Split into smaller libraries 

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

1. Review LOG.warn and LOG.error
    1. Change Debug to Verbose
    1. Change WARN/ERROR to DEBUG
    1. web socket broken format error should be just warn, not error.
1. Review LOG.warn and LOG.error
    1. Error should be only of library used it in wrong way, internal error should be just warnings
1. For timer and promise wrap exception into try/catch to run integration tests smoothly
1. Share specification document
   1. algin application according to spec
        1. rename packages and namings to amid-ukr-vnf (Document updated to amid-ukr-vnf, library is not required, as in JS it is bundled as one file not a folder )
        1. rename eva to eva (Done)
        1. rename big message to name according to specification document (Marshaller Hub) (Done)
        1. Rename store to registry
            1. Update specification 
            1. update code (store persistent thing)
1. Registry: most of the command can do with retry