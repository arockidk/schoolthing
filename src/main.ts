import { baseUrl, detailsUrl, fullUrl, infoUrl, loginUrl, userUrl} from "./data.js";
interface Formattable {
    toString(): string[]
}
function formatString(str: string, ...args: any[]) {
    for (let i = 0; i < args.length; i++) {
        let idx = str.indexOf("{" + i + "}");
        if (idx == -1) {
            continue;
        }
        let backslash_count = 0;
        for (let j = idx - 1; j >= 0; j--) {
            if (str[j] == "\\") {
                backslash_count += 1;
            } else {
                continue;
            }
        }
        if (backslash_count % 2 == 0) {
            str = str.substring(0, idx) + args[i] + str.substring(idx + 3);
        }
    }
    return str;
}
function listString(...args: any[]) {
    let builder = "";
    if (args.length == 0) {
        return "";
    } else if (args.length == 1) {
        return args[0];
    }
    for (let i = 0; i < args.length - 2; i++) {
        builder += args[i] + ", ";
    }
    builder += args[args.length - 2] + ", and " + args[args.length - 1];
    return builder;
}
class Time implements Formattable {
    constructor(public hours: number = 0, public minutes: number = 0, public seconds: number = 0) {
        
    }
    public static fromNumber(n: number) {
        let hours = Math.floor(n / 3600);
        let minutes = Math.floor((n - hours * 3600) / 60);
        let seconds = n - hours * 3600 - minutes * 60;
        return new Time(hours, minutes, seconds);
    }
    public static fromSentralString(str: string) {
        let components = str.split(":");
        let parts = components.map(v=>parseInt(v));
        return new Time(parts[0], parts[1])
    }
    public toNumber() {
        return this.hours * 3600 + this.minutes * 60 + this.seconds;
    }
    public modulo() {
        this.hours = this.hours % 24;
        this.minutes = this.minutes % 60;
        this.seconds = this.seconds % 60;
    }
    public toString(): string[] {
        let ret = ["", "", ""];
        if (this.hours < 10) {
            ret[0] = "0" + this.hours;
        } else {
            ret[0] = this.hours.toString();
        }
        if (this.minutes < 10) {
            ret[1] = "0" + this.minutes;
        } else {
            ret[1] = this.minutes.toString();
        }
        if (this.seconds < 10) {
            ret[2] = "0" + this.seconds;
        } else {
            ret[2] = this.seconds.toString();
        }
        return ret;
    }

}
interface Class {
    subject: string;
    name: string;
    teacher: string;
    teacher_user_id: number;
}
interface TimetableLesson {
    class_background_colour: string;
    class_border_colour: string;
    class_heading_colour: string;
    first_period: boolean;
    has_teacher: boolean;
    last_period: boolean;
    lesson_class_name: string;
    lesson_is_composite: boolean;
    room_name: string;
    subject_name: string;
    teachers: string[];

}

interface TimetablePeriod {
    is_now: boolean;
    start_time: string;
    end_time: string;
    lessons: TimetableLesson[];
    name: string;
}
interface TimetableDay {
    date_name: string;
    day_name: string;
    is_current_week: boolean;
    is_today: boolean;
    period: TimetablePeriod[];    
}
interface TimetableWeek {
    dates: {
        1: TimetableDay;
        2: TimetableDay;
        3: TimetableDay;
        4: TimetableDay;
        5: TimetableDay;
    };
}

type TimetableCycle = [TimetableWeek, TimetableWeek];
let student_id = -1;
let classes: Class[] = [];
function periodComponent(period: TimetablePeriod) {
    console.log(period, period.name);
    let component = document.createElement("div");
    component.classList.add("day-period");
    let base = document.createElement("div");
    base.classList.add("period-base");
    
    let start: string[], end: string[];
    if (period.start_time) {
        start = Time.fromSentralString(period.start_time).toString();
    } else {
        start = ["??", "??", "??"]
    }
    if (period.end_time) {
        end = Time.fromSentralString(period.end_time).toString();
    } else {
        end = ["??", "??", "??"]
    }

    let periodTime = document.createElement("div");
    periodTime.classList.add("period-time");
    periodTime.innerText = formatString(
        "{0} | {1}:{2} - {4}:{5}",
        period.name,
        ...start,
        ...end
    )
    base.appendChild(periodTime);
    let periodInfo = document.createElement("div");
    periodInfo.classList.add("period-info");
    if (period.lessons.length > 0) {
        for (let lesson of period.lessons) {
            let teacher_string = "";
            if (lesson.teachers && lesson.teachers.length > 0) {
                teacher_string = listString(
                    ...lesson.teachers
                );
            } else {
                teacher_string = "N/A"
            }
            periodInfo.innerText = formatString(
                "{0} ({1}) \n\n In {2} with {3}",
                lesson.subject_name,
                lesson.lesson_class_name,
                lesson.room_name || "unknown",
                teacher_string
            )
        }
    } else {
        periodInfo.innerText = "No lesson"
    }
    base.appendChild(periodInfo);   
    component.appendChild(base);
    return component;
}
function dayToString(day: number) {
    switch (day) {
        case 0:
            return "Sunday";
        case 1:
            return "Monday";
        case 2:
            return "Tuesday";
        case 3:
            return "Wednesday";
        case 4:
            return "Thursday";
        case 5:
            return "Friday";
        case 6:
            return "Saturday";
        default:
            return "";
    }
}
function findToday(cycle: TimetableCycle) {
    for (let week of cycle) {
        for (let day of Object.values(week.dates)) {
            if (day.is_today) {
                return day;
            }
        }
    }
    return undefined;
}
async function storeSentralCookie() {
    let cookie = await chrome.cookies.get({

        "url": baseUrl,
        "name": "PortalSID"
    })
    chrome.storage.sync.set({
        "sid": cookie?.value
    })
    // console.log(cookie)

}
async function trySetSentralCookie() {
    let value = await chrome.storage.sync.get("sid");
    if (value.sid) {
        let result = await chrome.cookies.set({
            "url": baseUrl,
            "name": "PortalSID",
            "value": value.sid
        });
        console.log(result);
    }
}
async function onLoggedIn() {
    let details = await (await fetch(detailsUrl)).json();
    student_id = details.student_id;
    let student_info = await (await fetch(infoUrl + `&student_id=${student_id}`)).json();
    classes = student_info.classes;
    console.log(student_id);
    let currentTimetable: TimetableCycle = 
        await (await fetch(formatString(fullUrl, student_id))).json();
    console.log(currentTimetable);
    let today = findToday(currentTimetable);
    console.log(today);
    document.getElementById("day-name")!.innerText = dayToString(new Date().getDay());
    if (today) {
        for (let period of today.period) {
            let component = periodComponent(period);
            document.getElementById("day-periods")!.appendChild(component);
        }
    }

}
async function checkLogin(depth: number = 0): Promise<boolean> {

    let response = await fetch(userUrl);
    // need to login
    if (response.redirected) {
        console.log("AAAA");
        // loginButton.style.display = "block";
        // statusMessage.innerText = "Logged out of sentral."
        await trySetSentralCookie();
        if (depth == 0) {
            checkLogin(depth + 1);
        }
    } else {
        // loginButton.style.display = "none";
        // statusMessage.innerText = "Logged in to sentral.";
        await storeSentralCookie();
        await onLoggedIn();
    }
    return false;
}
async function updateTime() {
    let spanTime = document.getElementById("span-time")!;
    let spanDate = document.getElementById("span-date")!;
    let date = new Date();
    spanTime.innerText = date.toLocaleTimeString() + "." + 
        Math.round(date.getMilliseconds() / 10);
    spanDate.innerText = dayToString(date.getDay()) + ", " + date.toLocaleDateString();
}
async function setup() {
    // loginButton.addEventListener("click", function() {
    //     chrome.tabs.create({
    //         "url": loginUrl,
    //         "active": true
    //     });
    // })
    setInterval(updateTime, 1000/60);
    // setTimeout(()=>{
    //     checkLogin();
    
    // }, 5000)
    checkLogin();
}
setup();
