import prisma from "../prisma/client.js";

const getOneTeam = async(req,res) => {
    try {
        const team = await prisma.team.findUnique({
            where:{
                id:req.body.id
            }
        })
         return res.status(200).json({
            message: "team found successfully",
            team
        });
    } catch (error) {
        res.status(500).json("something went wrong");
    }
}

const createTeam = async(req,res) => {
    try{
        const  name  = req.body.name;
        const createdBy = req.user._id;

        if( !name || !createdBy ){
            return res.status(400).json({
                message: "Please fill all the required details."
            });
        }


        const team = await prisma.team.create({
            data: {
                name: name,
                createdById: createdBy
            }
        });


        return res.status(201).json({
            message: "User created successfully",
            team,
        });

    }catch(err){
        res.status(500).json("something went wrong");
    }

};

const updateTeam = async (req, res) => {
    try {
        const  name = req.body.name;

        const updatedTeam = await prisma.team.update({
            where: { id: req.body.id },  
            data: { name }
        });

        return res.status(200).json({
            success: true,
            message: "Team updated successfully",
            team: updatedTeam
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};
const deleteTeam = async (req, res) => {
    try {
        const team = await prisma.team.delete({
            where: { id: req.body.id }
        });

        if (!team) {
            return res.status(404).json({
                message: "team not found"
            });
        }


        return res.status(200).json({
            message: "team deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};

//-----------------------------------------------------------




export {createTeam,getOneTeam,updateTeam,deleteTeam}