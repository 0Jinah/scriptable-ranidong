// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-brown; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow icon-glyph: magic
// large 720 * 758
// medium 720 * 338
// small 338 * 338

const scriptName = Script.name()

// iCloud 경로 설정
const fm = FileManager.iCloud()
const basePath = `${fm.documentsDirectory()}/${scriptName}`
const currentCoordPath = `${basePath}/coord.json`
const prefPath = `${basePath}/pref.json`

// Base 폴더 생성
if (!fm.fileExists(basePath)) {
    fm.createDirectory(basePath)
}

// PREF 변수 가져오기
let prefData
await getPref()

// 폰트 정보
const FONT_NAME_BOLD = prefData.fontNameBold
const FONT_NAME_REGULAR = prefData.fontNameRegular
const FONT_SIZE_LARGE = Number(prefData.fontSizeLarge)
const FONT_SIZE_MEDIUM = Number(prefData.fontSizeMedium)
const FONT_SIZE_SMALL = Number(prefData.fontSizeSmall)

console.log(`FONT_NAME_BOLD : ${FONT_NAME_BOLD}, FONT_NAME_REGULAR : ${FONT_NAME_REGULAR}`)
console.log(
    `FONT_SIZE_LARGE : ${FONT_SIZE_LARGE}, FONT_SIZE_MEDIUM : ${FONT_SIZE_MEDIUM}, FONT_SIZE_SMALL : ${FONT_SIZE_SMALL}`
)

// 현재 위치 정보
let latitude, longitude, subLocal, locationData
await getCurrentCoord()

// 날씨 정보
const WEATHER_API_KEY = prefData.weatherApiKey
// const WEATHER_ICON_DOWNLOAD_URL = "http://openweathermap.org/img/wn"
const WEATHER_ICON_DOWNLOAD_URL =
    "https://raw.githubusercontent.com/0Jinah/scriptable-ranidong/master/resources/weather-icon"
console.log(`WEATHER_API_KEY: ${WEATHER_API_KEY}`)
const WEATHER_ICON_LOCAL_PATH = `${fm.documentsDirectory().replace("/private", "")}/weather-icons`

if (!fm.fileExists(WEATHER_ICON_LOCAL_PATH)) {
    console.log("Directry not exist creating one.")
    fm.createDirectory(WEATHER_ICON_LOCAL_PATH)
}

let weatherData = []
await getWeatherData()

console.log(weatherData)

// 날짜 정보
let today = new Date()
const week = formatDate("EEE", today)
const day = formatDate("d", today)
const month = formatDate("MMM", today)

console.log(`week : ${week}, month: ${month}, day: ${day}`)

/***********************
 * ---- Functions ------*
 ***********************/

// 환경변수 가져오기
async function getPref() {
    if (fm.fileExists(prefPath)) {
        await checkFileAvailability(prefPath)
        prefData = JSON.parse(fm.readString(prefPath))
    } else {
        throw new Error(`can't find pref file(${prefPath})`)
    }
}

// iCloud에서 파일 다운로드
async function checkFileAvailability(path) {
    if (fm.isFileStoredIniCloud(path) && !fm.isFileDownloaded(path)) {
        await fm.downloadFileFromiCloud(path)
    }
}

// URL에서 이미지 다운로드
async function getImageFromUrl(url) {
    const request = new Request(url)
    var res = await request.loadImage()
    return res
}

// 현재 위치 정보 가져오기
async function getCurrentCoord() {
    let currentLocation = {} // latitude, longitude

    try {
        Location.setAccuracyToHundredMeters() // 위치 정확도 100M 설정
        currentLocation = await Location.current()
        fm.writeString(currentCoordPath, JSON.stringify(currentLocation))

        latitude = currentLocation.latitude
        longitude = currentLocation.longitude

        locationData = await Location.reverseGeocode(latitude, longitude, "ko_KR")
        // console.log(locationData)

        subLocal = locationData[0].subLocality

        console.log(`latitude : ${latitude}`)
        console.log(`longitude : ${longitude}`)
        console.log(`subLocal : ${subLocal}`)
    } catch (e) {
        console.log(e)
    }
}

// 날씨 상태 변환
function convertWeatherId2String(weatherId) {
    const description = {
        2: "천둥번개",
        3: "이슬비",
        5: "비",
        6: "눈",
        7: "안개",
        8: "구름",
        800: "맑음",
    }

    if (weatherId === 800) {
        return description["800"]
    }

    return description[String(weatherId).charAt(0)]
}

// 날씨정보 가져오기 (open weather map)
async function getWeatherData() {
    const API_URL = `http://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&exclude=minutely,alerts&lang=kr&units=metric`
    rawData = JSON.parse(await new Request(API_URL).loadString())
    let daily = rawData.daily[0]

    for (i = 0; i < 5; i++) {
        let hourly = rawData.hourly[i * 3]

        let weather = {}
        weather.time = formatDate("HH", new Date(hourly.dt * 1000))
        weather.temp = Math.round(hourly.temp)
        weather.feelsLike = Math.round(hourly.feels_like)
        weather.pop = Math.round(hourly.pop * 100)
        weather.icon = hourly.weather[0].icon
        weather.iconLocalPath = `${WEATHER_ICON_LOCAL_PATH}/${hourly.weather[0].icon}.png`
        weather.iconDownloadPath = `${WEATHER_ICON_DOWNLOAD_URL}/${hourly.weather[0].icon}.png`
        weather.description = convertWeatherId2String(hourly.weather[0].id)
        weather.minTemp = Math.round(daily.temp.min)
        weather.maxTemp = Math.round(daily.temp.max)
        weatherData.push(weather)

        console.log(`index : ${i} : ${weather.iconDownloadPath}`)
        await getWeatherIconFromUrl(weather)
    }
}

// 날씨 아이콘 다운로드
async function getWeatherIconFromUrl(weather) {
    let image = await getImageFromUrl(weather.iconDownloadPath)
    fm.writeImage(weather.iconLocalPath, image)

    // console.log(`weatherImage : ${weatherImage}`)
    // fm.writeImage(obj.iconLocalPath, weatherImage)
    console.log(`weather icon(${weather.icon}) download complete.`)
}

// 날짜 형식 변환
function formatDate(format, date, locale) {
    var df = new DateFormatter()
    df.locale = locale ? locale : "en_US"
    df.dateFormat = format
    return df.string(date)
}

// Target에 Label 추가
function addLabel(text, fontSize, fontName, opacity, color, target) {
    let label = target.addText(text)
    label.font = new Font(fontName, fontSize)
    label.textColor = new Color(color, opacity)
    label.centerAlignText()
}

// Target에 구분자 추가
function addDelimiter(target) {
    target.addSpacer(8) // 공백

    let label = target.addText("|")
    label.font = new Font(FONT_NAME_BOLD, FONT_SIZE_MEDIUM)
    label.textColor = new Color("#ffffff", 0.7)
    label.centerAlignText()

    target.addSpacer(8) // 공백
}

// Target에 베터리 정보 추가
function batteryModule(target) {
    let batteryImg = target.addImage(renderBatteryIcon(Device.batteryLevel(), Device.isCharging()))
    console.log(`Device.isCharging() : ${Device.isCharging()}`)
    batteryImg.imageSize = new Size(35, 19)
    batteryImg.tintColor = new Color(Device.isCharging() ? "#ffffff" : "#ffffff", 0.7)
    target.addSpacer(2)
    addLabel(String(getBatteryPercent()), FONT_SIZE_LARGE, FONT_NAME_BOLD, 0.8, "#ffffff", target)
    addLabel("%", FONT_SIZE_LARGE, FONT_NAME_BOLD, 0.8, "#ffffff", target)
}

// 베터리 퍼센트 계산
function getBatteryPercent() {
    // Getting Battery Level (Number)
    const batteryData = Device.batteryLevel()
    const batteryLevel = Math.round(batteryData * 100)
    return batteryLevel
}

// 베터리 Draw 생성
function renderBatteryIcon(batteryLevel, isCharging = false) {
    // 충전 중 표시
    if (isCharging) {
        return SFSymbol.named("battery.100.bolt").image
    }

    // 베터리 아이콘 크기
    const batteryWidth = 87
    const batteryHeight = 41

    // Start our draw context.
    let draw = new DrawContext()
    draw.opaque = false
    draw.respectScreenScale = true
    draw.size = new Size(batteryWidth, batteryHeight)

    // 베터리 아이콘 추가
    draw.drawImageInRect(SFSymbol.named("battery.0").image, new Rect(0, 0, batteryWidth, batteryHeight))

    // Match the battery level values to the SFSymbol.
    const x = batteryWidth * 0.1525
    const y = batteryHeight * 0.247
    const width = batteryWidth * 0.602
    const height = batteryHeight * 0.505

    // Prevent unreadable icons.
    let level = batteryLevel
    if (level < 0.05) {
        level = 0.05
    }

    // Determine the width and radius of the battery level.
    const current = width * level
    let radius = height / 6.5

    // When it gets low, adjust the radius to match.
    if (current < radius * 2) {
        radius = current / 2
    }

    // Make the path for the battery level.
    let barPath = new Path()
    barPath.addRoundedRect(new Rect(x, y, current, height), radius, radius)
    draw.addPath(barPath)
    draw.setFillColor(Color.black())
    draw.fillPath()
    return draw.getImage()
}

/***********************
 * ---- Layout ------*
 ***********************/

const WIDGET = new ListWidget()
WIDGET.backgroundImage = fm.readImage(
    "/var/mobile/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/image.jpg"
)

// 1단
WIDGET.addSpacer()
const level1Stack = WIDGET.addStack()
level1Stack.addSpacer()
addLabel(`${week}, ${month} ${day}`, FONT_SIZE_LARGE, FONT_NAME_BOLD, 0.8, "#ffffff", level1Stack) // 날짜정보 추가
addDelimiter(level1Stack) // 구분자

const locationIcon = level1Stack.addImage(SFSymbol.named("location.fill").image)
locationIcon.imageSize = new Size(15, 15)
locationIcon.tintColor = new Color("#ffffff", 0.7)
addLabel(subLocal, FONT_SIZE_LARGE, FONT_NAME_BOLD, 0.8, "#ffffff", level1Stack) // 위치 정보 추가

addDelimiter(level1Stack) // 구분자
batteryModule(level1Stack) // 베터리 정보
level1Stack.addSpacer()

// 2단
WIDGET.addSpacer()
const level2Stack = WIDGET.addStack()
level2Stack.addSpacer()
level2Stack.centerAlignContent()
level2Stack.borderWidth = 0

// 현재시간 날씨
const weatherD0Stack = level2Stack.addStack()
weatherD0Stack.centerAlignContent()
weatherD0Stack.borderWidth = 0
weatherD0Stack.size = new Size(80, 50)

// 현재날씨 아이콘
const weatherD0IconStack = weatherD0Stack.addStack()
weatherD0IconStack.layoutVertically()

weatherD0IconStack.borderWidth = 0

const weatherIconStack = weatherD0IconStack.addStack()
weatherIconStack.layoutHorizontally()

weatherIconStack.addSpacer()
const weatherIcon = weatherIconStack.addImage(Image.fromFile(weatherData[0].iconLocalPath))
weatherIcon.imageSize = new Size(35, 35)
weatherIconStack.addSpacer()


// 현재 날씨 설명
const weatherDescriptionStack = weatherD0IconStack.addStack()
weatherDescriptionStack.layoutHorizontally()
weatherDescriptionStack.addSpacer()
addLabel(weatherData[0].description, FONT_SIZE_MEDIUM, FONT_NAME_BOLD, 0.8, "#ffffff", weatherDescriptionStack)
weatherDescriptionStack.addSpacer()


weatherD0Stack.layoutHorizontally()
weatherD0Stack.addSpacer(2)

console.log(`weatherD0Stack.size :`)
console.log(weatherD0Stack.size)

// 현재 온도
const weatherD0TempStack = weatherD0Stack.addStack()
weatherD0TempStack.layoutVertically()

const tempStack = weatherD0TempStack.addStack()
addLabel(`${weatherData[0].temp}°`, FONT_SIZE_LARGE, FONT_NAME_BOLD, 0.8, "#ffffff", tempStack)
// addLabel("/", FONT_SIZE_SMALL, FONT_NAME_BOLD, 0.8, "#ffffff", tempStack)
// addLabel(`${weatherData[0].feelsLike}°`, FONT_SIZE_LARGE, FONT_NAME_BOLD, 0.8, "#ffffff", tempStack)

const minMaxStack = weatherD0TempStack.addStack()

addLabel(`${weatherData[0].minTemp}°`, FONT_SIZE_SMALL, FONT_NAME_BOLD, 0.8, "#ffffff", minMaxStack)
addLabel("/", FONT_SIZE_SMALL, FONT_NAME_BOLD, 0.8, "#ffffff", minMaxStack)
addLabel(`${weatherData[0].maxTemp}°`, FONT_SIZE_SMALL, FONT_NAME_BOLD, 0.8, "#ffffff", minMaxStack)
addLabel(`${weatherData[0].pop}%`, FONT_SIZE_SMALL, FONT_NAME_BOLD, 0.8, "#ffffff", weatherD0TempStack)

// 이후 날씨
level2Stack.addSpacer(5)
const delLine = level2Stack.addStack()
delLine.size = new Size(1, 50)
delLine.borderWidth = 0
delLine.borderColor = new Color("#ffffff", 0.3)


weatherData.forEach((obj, idx) => {
    if (idx > 0) {
        const weatherD1Stack = level2Stack.addStack()
        weatherD1Stack.size = new Size(55, 50)
        weatherD1Stack.borderWidth = 0
        weatherD1Stack.centerAlignContent()
        weatherD1Stack.layoutVertically()

        // 시간
        const weatherD1TimeStack = weatherD1Stack.addStack()
        weatherD1TimeStack.layoutHorizontally()
        weatherD1TimeStack.addSpacer()
        addLabel(`${weatherData[idx].time}시`, FONT_SIZE_SMALL, FONT_NAME_BOLD, 0.8, "#ffffff", weatherD1TimeStack)
        weatherD1TimeStack.addSpacer()

        // 아이콘
        const weatherD1IconStack = weatherD1Stack.addStack()
        weatherD1IconStack.addSpacer()
        const weatherD0Icon = weatherD1IconStack.addImage(Image.fromFile(weatherData[idx].iconLocalPath))
        weatherD0Icon.imageSize = new Size(23, 23)
        weatherD1IconStack.addSpacer()

        // 온도
        const weatherD1TempStack = weatherD1Stack.addStack()
        weatherD1TempStack.addSpacer()
        addLabel(
            `${weatherData[idx].temp}°/${weatherData[idx].pop}%`,
            FONT_SIZE_SMALL,
            FONT_NAME_BOLD,
            0.8,
            "#ffffff",
            weatherD1TempStack
        )
        weatherD1TempStack.addSpacer()
    }
})
level2Stack.addSpacer()

// 3단
WIDGET.addSpacer()
const level3Stack = WIDGET.addStack()
level3Stack.addSpacer()
level3Stack.borderWidth = 0


const counter1 = level3Stack.addStack()
addLabel("라니동동 1,222일 💕", FONT_SIZE_SMALL, FONT_NAME_BOLD, 0.8, "#ffffff", counter1)

const counter2 = level3Stack.addStack()
addLabel("Wedding 1,222일 😝", FONT_SIZE_SMALL, FONT_NAME_BOLD, 0.8, "#ffffff", counter2)



level3Stack.addSpacer()


if (config.runsInWidget) {
    Script.setWidget(WIDGET)
} else {
    WIDGET.presentMedium()
}
Script.complete()
