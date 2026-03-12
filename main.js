const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    // TODO: Implement this function * here will you put your code for function 1 
    const toSeconds = (timeStr) => {
        const [time, period] = timeStr.trim().split(' ');
        let [h, m, s] = time.split(':').map(Number);// convert each string to number 
        if (period === 'pm' && h !== 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        return h * 3600 + m * 60 + s;
    };
    const diff = toSeconds(endTime) - toSeconds(startTime);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    const toSeconds = (timeStr) => {
        const [time, period] = timeStr.trim().split(' ');
        let [h, m, s] = time.split(':').map(Number);
        if (period === 'pm' && h !== 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        return h * 3600 + m * 60 + s;
    };

    // Delivery hours: 8AM to 10PM
    const deliveryStart = 8 * 3600;
    const deliveryEnd = 22 * 3600;

    const start = toSeconds(startTime);
    const end = toSeconds(endTime);

    // Calculate idle time before 8AM and after 10PM
    let idle = 0;
    if (start < deliveryStart) {
        idle += deliveryStart - start;
    }
    if (end > deliveryEnd) {
        idle += end - deliveryEnd;
    }

    const h = Math.floor(idle / 3600);
    const m = Math.floor((idle % 3600) / 60);
    const s = idle % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}


// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    // Helper (converts to seconds ya adala)
    const toSeconds = (timeStr) => {
        let [h, m, s] = timeStr.trim().split(':').map(Number);
        return h * 3600 + m * 60 + s;
    };
    // activeTime = diff
    const diff = toSeconds(shiftDuration) - toSeconds(idleTime);

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}


// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // Convert activeTime "h:mm:ss" to total seconds
    const toSeconds = (timeStr) => {
        let [h, m, s] = timeStr.trim().split(':').map(Number);
        return h * 3600 + m * 60 + s;
    };

    const [year, month, day] = date.split('-').map(Number);

    //  Eid period (April 10-30, 2025)
    const isEid = (year === 2025 && month === 4 && day >= 10 && day <= 30);
    const quota = isEid ? 6 * 3600 : 8 * 3600 + 24 * 60;
    // Return true if activeTime >= quota, false otherwise
    return toSeconds(activeTime) >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // Read file using fs and split into lines
    const lines = fs.readFileSync(textFile, 'utf8').trim().split('\n');

    //  if driverID and date already exist in the text file
    for (let line of lines) {
        const [id, , date] = line.split(',');
        if (id.trim() === shiftObj.driverID && date.trim() === shiftObj.date) {
            return {};// Return empty object if duplicate found
        }
    }

    // Calculate all values using functions 1-4
    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const quota = metQuota(shiftObj.date, activeTime);

    // Create new record object with 10 properties
    const newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quota,
        hasBonus: false
    };

    // Create new line to add to file
    const newLine = `${newRecord.driverID},${newRecord.driverName},${newRecord.date},${newRecord.startTime},${newRecord.endTime},${newRecord.shiftDuration},${newRecord.idleTime},${newRecord.activeTime},${newRecord.metQuota},${newRecord.hasBonus}`;

    // Find last driverID 
    let lastIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].split(',')[0].trim() === shiftObj.driverID) {
            lastIndex = i;
        }
    }

    // If driverID not found, add at end, else insert after last record
    if (lastIndex === -1) {
        lines.push(newLine);
    } else {
        lines.splice(lastIndex + 1, 0, newLine);
    }

    // Write back to file
    fs.writeFileSync(textFile, lines.join('\n'), 'utf8');

    return newRecord;

}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    const lines = fs.readFileSync(textFile, 'utf8').trim().split('\n');

    // Loop to find matching driverID and date
    for (let i = 0; i < lines.length; i++) {
        const columns = lines[i].split(',');
        const id = columns[0].trim();
        const lineDate = columns[2].trim();

        // If match found, update hasBonus value
        if (id === driverID && lineDate === date) {
            columns[9] = newValue; // hasBonus is the 10th column (index 9)
            lines[i] = columns.join(','); // Update the line with new hasBonus value
            break; // Exit loop after updating
        }
    }
    fs.writeFileSync(textFile, lines.join('\n'), 'utf8');

}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    const lines = fs.readFileSync(textFile, 'utf8').trim().split('\n');

    //  if driverID exists in file
    let driverExists = false;
    let count = 0;

    // Loop through lines to find matching driverID and month, then count hasBonus true
    for (let line of lines) {
        const columns = line.split(',');
        const id = columns[0].trim();
        const date = columns[2].trim(); // date is "yyyy-mm-dd"
        const hasBonus = columns[9].trim(); // hasBonus is last column

        if (id === driverID) {
            driverExists = true;

            // Get month from date and remove leading zero
            const lineMonth = parseInt(date.split('-')[1]);
            const inputMonth = parseInt(month);

            // If month matches and hasBonus is true, count it
            if (lineMonth === inputMonth && hasBonus === 'true') {
                count++;
            }
        }
    }

    // Return -1 if driverID not found
    if (!driverExists) return -1;

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    const lines = fs.readFileSync(textFile, 'utf8').trim().split('\n');
    // Start with zero total seconds
    let totalSeconds = 0;
    
    for (let line of lines) {
        const columns = line.split(',');
        const id = columns[0].trim();
        const date = columns[2].trim();
        const activeTime = columns[7].trim(); // activeTime is 8th column

        // Check if driverID and month match
        const lineMonth = parseInt(date.split('-')[1]);

        if (id === driverID && lineMonth === month) {
            // Convert activeTime to seconds and add to total
            const [h, m, s] = activeTime.split(':').map(Number);
            totalSeconds += h * 3600 + m * 60 + s;
        }
    }
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // Read both files
    const shiftLines = fs.readFileSync(textFile, 'utf8').trim().split('\n');
    const rateLines = fs.readFileSync(rateFile, 'utf8').trim().split('\n');

    // Find driver's dayOff from rateFile
    let dayOff = '';
    for (let line of rateLines) {
        const columns = line.split(',');
        if (columns[0].trim() === driverID) {
            dayOff = columns[1].trim(); // dayOff is 2nd column
        }
    }

    // Days of week array to convert day name to number
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let totalSeconds = 0;

    for (let line of shiftLines) {
        const columns = line.split(',');
        const id = columns[0].trim();
        const date = columns[2].trim();

        if (id === driverID) {
            const lineMonth = parseInt(date.split('-')[1]);

            if (lineMonth === month) {
                // Get day of week for this date
                const dateObj = new Date(date);
                const dayName = days[dateObj.getDay()];

                // Skip if it is driver's day off
                if (dayName === dayOff) continue;

                // Check if date is in Eid period (April 10-30, 2025)
                const [year, m, day] = date.split('-').map(Number);
                const isEid = (year === 2025 && m === 4 && day >= 10 && day <= 30);

                // Add daily quota in seconds
                const dailyQuota = isEid ? 6 * 3600 : 8 * 3600 + 24 * 60;
                totalSeconds += dailyQuota;
            }
        }
    }

    // Reduce 2 hours for each bonus
    totalSeconds -= bonusCount * 2 * 3600;

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // Read the rate file
    const rateLines = fs.readFileSync(rateFile, 'utf8').trim().split('\n');
    // Find driver's basePay and tier from rateFile
    let basePay = 0;
    let tier = 0;
    for (let line of rateLines) {
        const columns = line.split(',');
        if (columns[0].trim() === driverID) {
            basePay = parseInt(columns[2].trim()); // basePay is 3rd column
            tier = parseInt(columns[3].trim());    // tier is 4th column
        }
    }

    // Allowed missing hours per tier
    const allowedMissing = { 1: 50, 2: 20, 3: 10, 4: 3 };

    // Convert actualHours and requiredHours to total seconds
    const toSeconds = (timeStr) => {
        const [h, m, s] = timeStr.trim().split(':').map(Number);
        return h * 3600 + m * 60 + s;
    };

    const actualSeconds = toSeconds(actualHours);
    const requiredSeconds = toSeconds(requiredHours);

    // If actual >= required, no deduction
    if (actualSeconds >= requiredSeconds) return basePay;

    // Calculate missing hours in seconds
    let missingSeconds = requiredSeconds - actualSeconds;

    // Remove allowed missing hours
    const allowedSeconds = allowedMissing[tier] * 3600;
    missingSeconds -= allowedSeconds;

    // If missing is within allowed, no deduction
    if (missingSeconds <= 0) return basePay;

    // Only full hours count
    const missingHours = Math.floor(missingSeconds / 3600);

    // Calculate deduction
    const deductionRatePerHour = Math.floor(basePay / 185);
    const salaryDeduction = missingHours * deductionRatePerHour;

    return basePay - salaryDeduction; // Net pay 

}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
