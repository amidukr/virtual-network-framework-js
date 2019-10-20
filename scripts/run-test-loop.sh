#!/bin/bash

echo "Test Suite" | tee run.log

for i in {1..20}
do

  echo "Test run index: $i" | tee -a run.log
  echo "  Test suite started at $(date)" | tee -a run.log

  (npm test; echo "  Exit code: $?" | tee -a run.log  ) | tee log.$i.log

  echo "  Finished at $(date)" | tee -a run.log
  echo | tee -a run.log

done
