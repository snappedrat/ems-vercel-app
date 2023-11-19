const express = require('express')
// const serverless = require('serverless-http')
const app = express()
const router = express.Router();
const fs = require('fs')
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(express.static('../dist'))
const port = 3000
const path = require('path');
const exp = require('constants');
const dataPath = './employees.json';

const morgan = require('morgan');
const cors = require('cors');
app.use(cors())
// app.use(cors({
//     origin: 'http://localhost:3000',
//   }));
app.use(morgan('dev'));

const corsOptions = {
    origin: true,
    credentials: true
}
app.options('*', cors(corsOptions));

// const dataPath = "../data/employees.json"
console.log(dataPath)
function generateId(employees){
    let ids = employees.map(emp => emp.id)
    let empId = Math.max(...ids)
    return empId >=1 ? empId+1 : 1;
}

function readData(){
    let employeeData = fs.readFileSync(dataPath, 'utf8')
    employeeData = JSON.parse(employeeData)
    return employeeData
}
function writeData(employeeData){
    fs.writeFileSync(dataPath, JSON.stringify(employeeData))
}

function ageFinder(dob){

    let birthDate = new Date(dob);
    let currDate = new Date();
    if(!birthDate)
        return false;
    else{
        let age = currDate.getFullYear() - birthDate.getFullYear();
        if (currDate.getMonth() < birthDate.getMonth() ||
            (currDate.getMonth() === birthDate.getMonth() &&
              currDate.getDate() < birthDate.getDate())) 
            {
            return age - 1;
            }  
        return age;
    }
}

function criteriaSearch(key,value) {
    debugger;
    if (value.trim().length != 0) {
        let empData = readData();
        let newEmpData = [];
        if (key == 'salary' || key == 'age') {
            value = JSON.parse(value)
            empData.forEach(element => {
                if (element[key] >= Number(value.min) && element[key] <= Number(value.max)) {
                    newEmpData.push(element);
                }            
            });
        } else {
            empData.forEach(element => {
                console.log(element[key].toLowerCase(), value.toLowerCase());
                if (element[key].toLowerCase().startsWith(value.toLowerCase())) {

                    newEmpData.push(element);
                }            
            });
        }
        return newEmpData;
        
    }
}

router.get('/filterCriteria', async(req,res)=>{
    console.log(req.query);
    let key = req.query.key;
    let value = req.query.value;
    let newEmpData;
    if(key == 'alldetails')
        newEmpData = readData();
    else
        newEmpData = criteriaSearch(key, value);
    res.status(200).send(newEmpData);
})

// router.get('/', (req,res)=>{
//     res.send("app running...")
// })

router.get('/index', (req,res)=>{
    res.sendFile(path.join(__dirname, 'index.html'))
})

router.get('/employees', async(req,res)=>{
    let employeeData = readData()
    res.status(200).send(employeeData);
})

router.get('/employee', async(req,res)=>{
    const EmpId = req.query.id;
    let employeeData = readData()
    let newEmployeeData = [];
    const employee = employeeData.find(emp => emp.id === parseInt(EmpId))
    if(employee){
        newEmployeeData[0] = employee; 
        res.status(200).send(newEmployeeData)
    }
    else
        res.status(404).send({message : "Employee not found"})

})

router.post('/addEmployee', async(req,res)=>{

    userData = req.body
    console.log(userData)
    if(!userData.fullname || !userData.department || !userData.dob || !userData.salary){
        return res.status(400).send({message:"Please enter all valid fields"})
    }
    else{
        let employeeData = readData()
        userData.id = generateId(employeeData)
        let age = ageFinder(userData.dob);
        if(!age || age<0){
            return res.status(400).send({message: "Enter valid Date of Birth Format : (dd/mm/yyyy)"});
        }
        if(typeof(userData.salary)!='number')
            return res.status(400).send({message : "Enter valid Salary"});

        userData.age = age;

        employeeData.push(userData)
        writeData(employeeData)
        res.status(201).send({message : "successfully added employee : " + userData.id})    
    }

})

router.put('/editEmployee/:id', async(req,res)=>{

    const updateData = req.body;
    const updates = Object.keys(updateData)
    const allowed = ['fullname', 'department', 'salary', 'dob'];
    console.log(req.body)
    const isValid = updates.every((update) => allowed.includes(update))
    if(!isValid)
        return res.status(400).send({message : "Enter valid Updates only"});
    
    let employeeData = readData()
    let index = employeeData.findIndex(emp => emp.id === parseInt(req.params.id));
    
    if(index!==-1){
        for(const key of updates){
            employeeData[index][key] = updateData[key];
        }

        if(updates.includes('dob')){
            let age = ageFinder(employeeData[index].dob);
            if(!age || age<0){
                return res.status(400).send({message : "Enter valid Date of Birth Format : (dd/mm/yyyy)"});
            }
            employeeData[index].age = age;
        }
        writeData(employeeData)
        res.status(200).send({message : "successfully updated"})
    }
    else
        res.status(404).send({message : "Employee not found"})
})

router.delete('/deleteEmployee/:id', async(req,res)=>{
    const id = req.params.id;
    let employeeData = readData()
    let index = employeeData.findIndex(emp => emp.id === parseInt(id));
    console.log(index, id);
    if(index != -1){
        employeeData.splice(index, 1);
        writeData(employeeData)
    }
    else
        res.status(404).send({message : "Employee not found"})
    res.status(200).send({message : "Employee successfully deleted"})
})

////////////////bonus APIS///////////////////

router.get('/averageSalary', async(req,res)=>{
    let employeeData = readData();
    let total = 0;
    let count = 0;
    employeeData.forEach((item, index)=>{
        total+=item.salary;
        count++;
    } )
    res.send({average : Math.round(total/count)})
})

router.get('/averageSalaryByDepartment/:department', async(req,res)=>{
    let department = req.params.department;
    let employeeData = readData();
    let total = 0;
    let count = 0;
    employeeData.forEach((item, index)=>{
        if(item.department === department){
            total+=item.salary;
            count++;
        }
    } )
    res.send({average : Math.round(total/count)})
})

// router.post('/dummy', async(req,res)=>{
//     const x = req.body;
//     let arr = readData();
//     let newarr = getUniqueDepartments(arr)
//     console.log(newarr);
//     arr.forEach(employee =>{
//         employee.id = employee.id+1000;
//         employee.age = ageFinder(employee.dob);
//     })
//     writeData(arr);
//     res.send("dfgdfg")  
// })


app.use('/', router)
// module.exports.handler = serverless(app)
app.listen(port,()=>{console.log("running....");})